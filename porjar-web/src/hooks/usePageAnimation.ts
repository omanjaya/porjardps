'use client'

import { useEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Shared GSAP animation hook for all public pages.
 *
 * CSS class contract:
 *   .anim-header     → entrance: slide down from y=-20 (page titles / breadcrumbs)
 *   .anim-hero       → entrance: slide up from y=50   (hero banners / score cards)
 *   .anim-card       → ScrollTrigger stagger up y=40  (grid cards)
 *   .anim-list-item  → ScrollTrigger stagger left x=-16 (list rows)
 *   .anim-section    → ScrollTrigger fade up y=30     (whole sections)
 *   .anim-fade       → ScrollTrigger subtle fade y=15 (small supporting elements)
 *
 * @param containerRef  Ref to the element that scopes all GSAP queries
 * @param deps          Re-run animations when these change (e.g. [loading])
 */
export function usePageAnimation(
  containerRef: RefObject<HTMLElement | null>,
  deps: unknown[] = []
) {
  useEffect(() => {
    if (!containerRef.current) return

    const ctx = gsap.context(() => {
      const ease = 'power3.out'
      const el = containerRef.current!

      // ── Entrance (fires immediately, no ScrollTrigger)
      const headers = el.querySelectorAll('.anim-header')
      if (headers.length) {
        gsap.fromTo(headers,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease, delay: 0.05, stagger: 0.07 }
        )
      }

      const heroes = el.querySelectorAll('.anim-hero')
      if (heroes.length) {
        gsap.fromTo(heroes,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease, delay: 0.15, stagger: 0.1 }
        )
      }

      // ── Cards: group by direct parent to create isolated stagger groups
      const cardParents = new Map<Element, Element[]>()
      el.querySelectorAll('.anim-card').forEach((child) => {
        const p = child.parentElement!
        if (!cardParents.has(p)) cardParents.set(p, [])
        cardParents.get(p)!.push(child)
      })
      cardParents.forEach((cards, parent) => {
        gsap.fromTo(cards,
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease,
            scrollTrigger: { trigger: parent, start: 'top 87%', once: true },
          }
        )
      })

      // ── List items: group by direct parent for per-list stagger
      const listParents = new Map<Element, Element[]>()
      el.querySelectorAll('.anim-list-item').forEach((child) => {
        const p = child.parentElement!
        if (!listParents.has(p)) listParents.set(p, [])
        listParents.get(p)!.push(child)
      })
      listParents.forEach((items, parent) => {
        gsap.fromTo(items,
          { x: -16, opacity: 0 },
          {
            x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease,
            scrollTrigger: { trigger: parent, start: 'top 87%', once: true },
          }
        )
      })

      // ── Sections: each triggers independently
      el.querySelectorAll('.anim-section').forEach((section) => {
        gsap.fromTo(section,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease, scrollTrigger: { trigger: section, start: 'top 87%', once: true } }
        )
      })

      // ── Fade: lightest treatment
      el.querySelectorAll('.anim-fade').forEach((target) => {
        gsap.fromTo(target,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease, scrollTrigger: { trigger: target, start: 'top 90%', once: true } }
        )
      })
    }, containerRef)

    return () => ctx.revert()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
