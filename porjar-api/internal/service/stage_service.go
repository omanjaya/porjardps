package service

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

type StageService struct {
	stageRepo      model.StageRepository
	tournamentRepo model.TournamentRepository
	groupService   *GroupService
	bracketService *BracketService
	ttRepo         model.TournamentTeamRepository
	teamRepo       model.TeamRepository
	standingsRepo  model.StandingsRepository
}

func NewStageService(
	stageRepo model.StageRepository,
	tournamentRepo model.TournamentRepository,
	groupService *GroupService,
	bracketService *BracketService,
	ttRepo model.TournamentTeamRepository,
	teamRepo model.TeamRepository,
) *StageService {
	return &StageService{
		stageRepo:      stageRepo,
		tournamentRepo: tournamentRepo,
		groupService:   groupService,
		bracketService: bracketService,
		ttRepo:         ttRepo,
		teamRepo:       teamRepo,
	}
}

func (s *StageService) SetStandingsRepo(repo model.StandingsRepository) {
	s.standingsRepo = repo
}

var validStageTypes = map[string]bool{
	"swiss":                true,
	"round_robin":          true,
	"group_stage":          true,
	"single_elimination":   true,
	"double_elimination":   true,
	"battle_royale":        true,
}

func (s *StageService) CreateStage(ctx context.Context, tournamentID uuid.UUID, stageOrder int, stageType, name string, config json.RawMessage) (*model.TournamentStage, error) {
	if !validStageTypes[stageType] {
		return nil, apperror.BusinessRule("INVALID_STAGE_TYPE", "Tipe stage tidak valid")
	}

	t, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || t == nil {
		return nil, apperror.NotFound("TOURNAMENT")
	}

	if config == nil {
		config = json.RawMessage("{}")
	}

	stage := &model.TournamentStage{
		TournamentID: tournamentID,
		StageOrder:   stageOrder,
		StageType:    stageType,
		Name:         name,
		Config:       config,
		Status:       "pending",
	}

	if err := s.stageRepo.Create(ctx, stage); err != nil {
		return nil, apperror.Wrap(err, "create stage")
	}

	return stage, nil
}

func (s *StageService) ListStages(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentStage, error) {
	return s.stageRepo.FindByTournament(ctx, tournamentID)
}

func (s *StageService) ActivateStage(ctx context.Context, stageID uuid.UUID) error {
	stage, err := s.stageRepo.FindByID(ctx, stageID)
	if err != nil || stage == nil {
		return apperror.NotFound("STAGE")
	}
	if stage.Status != "pending" {
		return apperror.BusinessRule("INVALID_STATUS", "Stage harus berstatus pending untuk diaktifkan")
	}
	return s.stageRepo.UpdateStatus(ctx, stageID, "active")
}

func (s *StageService) CompleteStage(ctx context.Context, stageID uuid.UUID) error {
	stage, err := s.stageRepo.FindByID(ctx, stageID)
	if err != nil || stage == nil {
		return apperror.NotFound("STAGE")
	}
	if stage.Status != "active" {
		return apperror.BusinessRule("INVALID_STATUS", "Stage harus berstatus active untuk diselesaikan")
	}
	return s.stageRepo.UpdateStatus(ctx, stageID, "completed")
}

func (s *StageService) AdvanceToNextStage(ctx context.Context, stageID uuid.UUID) error {
	// 1. Load current stage, verify completed
	stage, err := s.stageRepo.FindByID(ctx, stageID)
	if err != nil || stage == nil {
		return apperror.NotFound("STAGE")
	}
	if stage.Status != "completed" {
		return apperror.BusinessRule("INVALID_STATUS", "Stage harus berstatus completed untuk advance")
	}

	// 2. Find next stage by stage_order
	stages, err := s.stageRepo.FindByTournament(ctx, stage.TournamentID)
	if err != nil {
		return apperror.Wrap(err, "find stages")
	}
	var nextStage *model.TournamentStage
	for _, st := range stages {
		if st.StageOrder == stage.StageOrder+1 {
			nextStage = st
			break
		}
	}
	if nextStage == nil {
		return apperror.BusinessRule("NO_NEXT_STAGE", "Tidak ada stage berikutnya")
	}

	// 3. Collect qualifying teams from current stage
	qualifying := s.collectQualifyingTeams(ctx, stage)
	if len(qualifying) < 2 {
		return apperror.BusinessRule("NOT_ENOUGH_QUALIFYING", "Minimal 2 tim harus lolos untuk melanjutkan ke stage berikutnya")
	}

	// 4. Seed into next stage based on type
	switch nextStage.StageType {
	case "single_elimination", "double_elimination":
		// Ensure qualifying teams are registered in tournament_teams
		for _, tid := range qualifying {
			existing, _ := s.ttRepo.FindByTournamentAndTeam(ctx, stage.TournamentID, tid)
			if existing == nil {
				tt := &model.TournamentTeam{
					ID:           uuid.New(),
					TournamentID: stage.TournamentID,
					TeamID:       tid,
					Status:       "approved",
				}
				if err := s.ttRepo.Create(ctx, tt); err != nil {
					slog.Error("failed to register qualifying team", "team_id", tid, "error", err)
				}
			}
		}

		// Build manual seeds from qualifying order (1-indexed)
		manualSeeds := make(map[uuid.UUID]int, len(qualifying))
		for i, tid := range qualifying {
			manualSeeds[tid] = i + 1
		}

		if _, _, err := s.bracketService.GenerateBracket(ctx, stage.TournamentID, manualSeeds); err != nil {
			return apperror.Wrap(err, "generate bracket for next stage")
		}

	case "swiss":
		// Parse config for swiss settings
		var swissCfg struct {
			Name          string `json:"name"`
			MaxRounds     int    `json:"max_rounds"`
			WinThreshold  int    `json:"win_threshold"`
			LossThreshold int    `json:"loss_threshold"`
			AdvanceCount  int    `json:"advance_count"`
		}
		if nextStage.Config != nil {
			_ = json.Unmarshal(nextStage.Config, &swissCfg)
		}
		if swissCfg.Name == "" {
			swissCfg.Name = nextStage.Name
		}
		if swissCfg.MaxRounds <= 0 {
			swissCfg.MaxRounds = 5
		}
		if swissCfg.WinThreshold <= 0 {
			swissCfg.WinThreshold = 3
		}
		if swissCfg.LossThreshold <= 0 {
			swissCfg.LossThreshold = 3
		}

		config := model.SwissConfig{
			MaxRounds:     swissCfg.MaxRounds,
			WinThreshold:  swissCfg.WinThreshold,
			LossThreshold: swissCfg.LossThreshold,
		}

		group, err := s.groupService.InitSwissGroup(ctx, stage.TournamentID, swissCfg.Name, config)
		if err != nil {
			return apperror.Wrap(err, "init swiss group for next stage")
		}

		// Add qualifying teams to the swiss group
		if err := s.groupService.AddTeams(ctx, group.ID, qualifying); err != nil {
			return apperror.Wrap(err, "add teams to swiss group")
		}

	case "round_robin", "group_stage":
		// Parse config for number of groups
		var groupCfg struct {
			NumGroups       int `json:"num_groups"`
			AdvancePerGroup int `json:"advance_per_group"`
			Legs            int `json:"legs"`
		}
		if nextStage.Config != nil {
			_ = json.Unmarshal(nextStage.Config, &groupCfg)
		}
		if groupCfg.NumGroups <= 0 {
			groupCfg.NumGroups = 1
		}
		if groupCfg.AdvancePerGroup <= 0 {
			groupCfg.AdvancePerGroup = 2
		}
		if groupCfg.Legs <= 0 {
			groupCfg.Legs = 1
		}

		// Ensure all qualifying teams are registered
		for _, tid := range qualifying {
			existing, _ := s.ttRepo.FindByTournamentAndTeam(ctx, stage.TournamentID, tid)
			if existing == nil {
				tt := &model.TournamentTeam{
					ID:           uuid.New(),
					TournamentID: stage.TournamentID,
					TeamID:       tid,
					Status:       "approved",
				}
				_ = s.ttRepo.Create(ctx, tt)
			}
		}

		if _, err := s.groupService.AutoDrawGroups(ctx, stage.TournamentID, groupCfg.NumGroups, groupCfg.AdvancePerGroup, groupCfg.Legs); err != nil {
			return apperror.Wrap(err, "auto draw groups for next stage")
		}

	case "battle_royale":
		// Seed qualifying teams into this BR stage's tournament
		for _, tid := range qualifying {
			existing, _ := s.ttRepo.FindByTournamentAndTeam(ctx, nextStage.TournamentID, tid)
			if existing == nil {
				tt := &model.TournamentTeam{
					ID:           uuid.New(),
					TournamentID: nextStage.TournamentID,
					TeamID:       tid,
					Status:       "approved",
				}
				if err := s.ttRepo.Create(ctx, tt); err != nil {
					slog.Error("failed to seed team to BR stage", "team_id", tid, "error", err)
				}
			}
		}
	}

	// 5. Activate next stage
	return s.stageRepo.UpdateStatus(ctx, nextStage.ID, "active")
}

func (s *StageService) collectQualifyingTeams(ctx context.Context, stage *model.TournamentStage) []uuid.UUID {
	var config struct {
		AdvanceCount int `json:"advance_count"`
	}
	if stage.Config != nil {
		_ = json.Unmarshal(stage.Config, &config)
	}
	if config.AdvanceCount <= 0 {
		config.AdvanceCount = 8
	}

	switch stage.StageType {
	case "swiss", "round_robin", "group_stage":
		groups, err := s.groupService.ListGroups(ctx, stage.TournamentID)
		if err != nil {
			slog.Error("collectQualifyingTeams: failed to list groups", "error", err)
			return nil
		}
		var result []uuid.UUID
		for _, g := range groups {
			standings, err := s.groupService.GetGroupStandings(ctx, g.ID)
			if err != nil {
				slog.Error("collectQualifyingTeams: failed to get standings", "group_id", g.ID, "error", err)
				continue
			}
			limit := g.AdvanceCount
			if limit <= 0 {
				limit = config.AdvanceCount
			}
			for i, st := range standings {
				if i >= limit {
					break
				}
				result = append(result, st.TeamID)
			}
		}
		return result

	case "single_elimination", "double_elimination", "battle_royale":
		if s.standingsRepo == nil {
			slog.Error("collectQualifyingTeams: standingsRepo not available")
			return nil
		}
		standings, err := s.standingsRepo.ListByTournament(ctx, stage.TournamentID)
		if err != nil {
			slog.Error("collectQualifyingTeams: failed to list standings", "error", err)
			return nil
		}
		var result []uuid.UUID
		for i, st := range standings {
			if i >= config.AdvanceCount {
				break
			}
			if !st.IsEliminated {
				result = append(result, st.TeamID)
			}
		}
		return result
	}

	return nil
}

func (s *StageService) DeleteStage(ctx context.Context, stageID uuid.UUID) error {
	stage, err := s.stageRepo.FindByID(ctx, stageID)
	if err != nil || stage == nil {
		return apperror.NotFound("STAGE")
	}
	return s.stageRepo.Delete(ctx, stageID)
}
