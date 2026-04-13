import React, { useState, useEffect } from 'react'
import { buildTutorContent } from '../utils/tutor.js'
import { detectElliottWaves } from '../utils/indicators.js'
import styles from './TutorPanel.module.css'

export default function TutorPanel({ result, points, stats }) {
  const [sections,      setSections]      = useState([])
  const [openIndex,     setOpenIndex]     = useState(0)   // first section open by default
  const [elliottWave,   setElliottWave]   = useState(null)

  useEffect(() => {
    if (!points || points.length < 40) { setElliottWave(null); return }
    try {
      const closes = points.map(p => p.close).filter(v => v != null && !isNaN(v))
      setElliottWave(detectElliottWaves(closes))
    } catch { setElliottWave(null) }
  }, [points])

  useEffect(() => {
    const built = buildTutorContent(result, elliottWave, stats)
    setSections(built || [])
    setOpenIndex(0)
  }, [result, elliottWave, stats])

  if (sections.length === 0) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>🎓</span>
        <div>
          <div className={styles.headerTitle}>Tutor — why this decision?</div>
          <div className={styles.headerSub}>Plain-English explanations of every signal. Click any topic to expand.</div>
        </div>
      </div>

      <div className={styles.list}>
        {sections.map((section, i) => {
          const isOpen = openIndex === i
          return (
            <div
              key={i}
              className={`${styles.section} ${isOpen ? styles.sectionOpen : ''} ${section.isWarning ? styles.sectionWarning : ''}`}
            >
              <button
                className={styles.sectionBtn}
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
              >
                <span className={styles.sectionIcon}>{section.icon}</span>
                <span className={styles.sectionTitle}>{section.title}</span>
                <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className={styles.sectionBody}>
                  {section.content.split('\n\n').map((para, j) => (
                    <p key={j} className={styles.para}>{para}</p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
