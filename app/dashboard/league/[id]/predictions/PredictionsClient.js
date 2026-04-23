'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const LOCK_DATE = new Date('2026-06-11T19:00:00Z')
const isLocked = () => new Date() >= LOCK_DATE

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

const GROUP_TEAMS = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Bosnia-Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['USA', 'Paraguay', 'Australia', 'Türkiye'],
  E: ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Tunisia', 'Sweden'],
  G: ['Belgium', 'Iran', 'Egypt', 'New Zealand'],
  H: ['Spain', 'Uruguay', 'Saudi Arabia', 'Cape Verde'],
  I: ['France', 'Senegal', 'Norway', 'Iraq'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Colombia', 'Uzbekistan', 'DR Congo'],
  L: ['England', 'Croatia', 'Panama', 'Ghana'],
}

const COUNTRY_CODES = {
  'Mexico':'mx','South Africa':'za','South Korea':'kr','Czechia':'cz',
  'Canada':'ca','Bosnia-Herzegovina':'ba','Qatar':'qa','Switzerland':'ch',
  'Brazil':'br','Morocco':'ma','Haiti':'ht','Scotland':'gb-sct',
  'USA':'us','Paraguay':'py','Australia':'au','Türkiye':'tr',
  'Germany':'de','Curaçao':'cw','Ivory Coast':'ci','Ecuador':'ec',
  'Netherlands':'nl','Japan':'jp','Tunisia':'tn','Sweden':'se',
  'Belgium':'be','Iran':'ir','Egypt':'eg','New Zealand':'nz',
  'Spain':'es','Uruguay':'uy','Saudi Arabia':'sa','Cape Verde':'cv',
  'France':'fr','Senegal':'sn','Norway':'no','Iraq':'iq',
  'Argentina':'ar','Algeria':'dz','Austria':'at','Jordan':'jo',
  'Portugal':'pt','Colombia':'co','Uzbekistan':'uz','DR Congo':'cd',
  'England':'gb-eng','Croatia':'hr','Panama':'pa','Ghana':'gh',
}

const flag = (t) => {
  const code = COUNTRY_CODES[t]
  return code ? `https://flagcdn.com/24x18/${code}.png` : null
}

const shortName = (name) => {
  const shorts = {
    'South Africa': 'S Africa',
    'South Korea': 'S Korea',
    'Bosnia-Herzegovina': 'Bosnia',
    'Switzerland': 'Swiss',
    'Australia': 'Austral',
    'Ivory Coast': 'C Ivoire',
    'Netherlands': 'Nether',
    'New Zealand': 'NZ',
    'Saudi Arabia': 'S Arabia',
    'Cape Verde': 'C Verde',
    'DR Congo': 'DR Congo',
  }
  return shorts[name] || (name.length > 8 ? name.slice(0, 7) : name)
}

// ─────────────────────────────────────────────────────────────────────────────
//  GROUP TABLE CALCULATION — FIFA 2026 Article 20 tiebreaker order:
//  1. Points  2. H2H pts  3. H2H GD  4. H2H GF  5. Overall GD  6. Overall GF
// ─────────────────────────────────────────────────────────────────────────────

function calcGroupTables(predictions, fixtures) {
  const tables = {}
  for (const g of GROUPS) {
    tables[g] = GROUP_TEAMS[g].map(t => ({
      team: t, played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, gd: 0, pts: 0, group: g,
    }))
  }
  const groupFixtures = fixtures.filter(f => f.round === 'group')
  for (const f of groupFixtures) {
    const pred = predictions[f.id]
    if (!pred || pred.home == null || pred.away == null) continue
    const g = f.match_group
    const t1 = tables[g]?.find(x => x.team === f.home_team)
    const t2 = tables[g]?.find(x => x.team === f.away_team)
    if (!t1 || !t2) continue
    t1.played++; t2.played++
    t1.gf += pred.home; t1.ga += pred.away
    t2.gf += pred.away; t2.ga += pred.home
    t1.gd = t1.gf - t1.ga; t2.gd = t2.gf - t2.ga
    if (pred.home > pred.away)      { t1.won++; t1.pts += 3; t2.lost++ }
    else if (pred.away > pred.home) { t2.won++; t2.pts += 3; t1.lost++ }
    else                            { t1.drawn++; t1.pts++; t2.drawn++; t2.pts++ }
  }
  for (const g of GROUPS) {
    tables[g] = sortGroupFifa(tables[g], g, predictions, fixtures)
  }
  return tables
}

function calcH2H(teamNames, groupLetter, predictions, fixtures) {
  const stats = {}
  for (const t of teamNames) stats[t] = { pts: 0, gd: 0, gf: 0 }
  for (const f of fixtures) {
    if (f.round !== 'group' || f.match_group !== groupLetter) continue
    if (!teamNames.includes(f.home_team) || !teamNames.includes(f.away_team)) continue
    const pred = predictions[f.id]
    if (!pred || pred.home == null || pred.away == null) continue
    stats[f.home_team].gf += pred.home
    stats[f.home_team].gd += pred.home - pred.away
    stats[f.away_team].gf += pred.away
    stats[f.away_team].gd += pred.away - pred.home
    if (pred.home > pred.away)      stats[f.home_team].pts += 3
    else if (pred.away > pred.home) stats[f.away_team].pts += 3
    else                            { stats[f.home_team].pts++; stats[f.away_team].pts++ }
  }
  return stats
}

function sortGroupFifa(rows, groupLetter, predictions, fixtures) {
  rows.sort((a, b) => b.pts - a.pts)
  const sorted = []
  let i = 0
  while (i < rows.length) {
    let j = i + 1
    while (j < rows.length && rows[j].pts === rows[i].pts) j++
    const tied = rows.slice(i, j)
    if (tied.length === 1) { sorted.push(...tied); i = j; continue }
    const h2h = calcH2H(tied.map(r => r.team), groupLetter, predictions, fixtures)
    tied.sort((a, b) => {
      const ha = h2h[a.team], hb = h2h[b.team]
      if (hb.pts !== ha.pts) return hb.pts - ha.pts
      if (hb.gd  !== ha.gd)  return hb.gd  - ha.gd
      if (hb.gf  !== ha.gf)  return hb.gf  - ha.gf
      if (b.gd   !== a.gd)   return b.gd   - a.gd
      return b.gf - a.gf
    })
    sorted.push(...tied)
    i = j
  }
  return sorted
}

// 3rd place ranking — no H2H (different groups), stop at GF
function calcAllThirds(tables) {
  return GROUPS
    .map(g => ({ ...tables[g][2], group: g }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
}

// ─────────────────────────────────────────────────────────────────────────────
//  FIFA ANNEX C — ALL 495 COMBINATIONS
//
//  Column order: [1A_opp, 1B_opp, 1D_opp, 1E_opp, 1G_opp, 1I_opp, 1K_opp, 1L_opp]
//  Key = sorted group letters of the 8 qualifying 3rd-place teams
//  Source: FIFA World Cup 2026 Competition Regulations, Annex C
//
//  How to use:
//  1. Rank all 12 third-place teams by FIFA rules, take the top 8
//  2. Extract their group letters → sort → join → look up key in ANNEX_C
//  3. The value array gives which group's 3rd-place team faces each winner:
//     value[0] faces 1A (M79), value[1] faces 1B (M85), value[2] faces 1D (M81),
//     value[3] faces 1E (M74), value[4] faces 1G (M82), value[5] faces 1I (M77),
//     value[6] faces 1K (M87), value[7] faces 1L (M80)
// ─────────────────────────────────────────────────────────────────────────────

const ANNEX_C = {
  'EFGHIJKL': ['E','J','I','F','H','G','L','K'], // row 1
  'DFGHIJKL': ['H','G','I','D','J','F','L','K'], // row 2
  'DEGHIJKL': ['E','J','I','D','H','G','L','K'], // row 3
  'DEFHIJKL': ['E','J','I','D','H','F','L','K'], // row 4
  'DEFGIJKL': ['E','G','I','D','J','F','L','K'], // row 5
  'DEFGHJKL': ['E','G','J','D','H','F','L','K'], // row 6
  'DEFGHIKL': ['E','G','I','D','H','F','L','K'], // row 7
  'DEFGHIJL': ['E','G','J','D','H','F','L','I'], // row 8
  'DEFGHIJK': ['E','G','J','D','H','F','I','K'], // row 9
  'CFGHIJKL': ['H','G','I','C','J','F','L','K'], // row 10
  'CEGHIJKL': ['E','J','I','C','H','G','L','K'], // row 11
  'CEFHIJKL': ['E','J','I','C','H','F','L','K'], // row 12
  'CEFGIJKL': ['E','G','I','C','J','F','L','K'], // row 13
  'CEFGHJKL': ['E','G','J','C','H','F','L','K'], // row 14
  'CEFGHIKL': ['E','G','I','C','H','F','L','K'], // row 15
  'CEFGHIJL': ['E','G','J','C','H','F','L','I'], // row 16
  'CEFGHIJK': ['E','G','J','C','H','F','I','K'], // row 17
  'CDGHIJKL': ['H','G','I','C','J','D','L','K'], // row 18
  'CDFHIJKL': ['C','J','I','D','H','F','L','K'], // row 19
  'CDFGIJKL': ['C','G','I','D','J','F','L','K'], // row 20
  'CDFGHJKL': ['C','G','J','D','H','F','L','K'], // row 21
  'CDFGHIKL': ['C','G','I','D','H','F','L','K'], // row 22
  'CDFGHIJL': ['C','G','J','D','H','F','L','I'], // row 23
  'CDFGHIJK': ['C','G','J','D','H','F','I','K'], // row 24
  'CDEHIJKL': ['E','J','I','C','H','D','L','K'], // row 25
  'CDEGIJKL': ['E','G','I','C','J','D','L','K'], // row 26
  'CDEGHJKL': ['E','G','J','C','H','D','L','K'], // row 27
  'CDEGHIKL': ['E','G','I','C','H','D','L','K'], // row 28
  'CDEGHIJL': ['E','G','J','C','H','D','L','I'], // row 29
  'CDEGHIJK': ['E','G','J','C','H','D','I','K'], // row 30
  'CDEFIJKL': ['C','J','E','D','I','F','L','K'], // row 31
  'CDEFHJKL': ['C','J','E','D','H','F','L','K'], // row 32
  'CDEFHIKL': ['C','E','I','D','H','F','L','K'], // row 33
  'CDEFHIJL': ['C','J','E','D','H','F','L','I'], // row 34
  'CDEFHIJK': ['C','J','E','D','H','F','I','K'], // row 35
  'CDEFGJKL': ['C','G','E','D','J','F','L','K'], // row 36
  'CDEFGIKL': ['C','G','E','D','I','F','L','K'], // row 37
  'CDEFGIJL': ['C','G','E','D','J','F','L','I'], // row 38
  'CDEFGIJK': ['C','G','E','D','J','F','I','K'], // row 39
  'CDEFGHKL': ['C','G','E','D','H','F','L','K'], // row 40
  'CDEFGHJL': ['C','G','J','D','H','F','L','E'], // row 41
  'CDEFGHJK': ['C','G','J','D','H','F','E','K'], // row 42
  'CDEFGHIL': ['C','G','E','D','H','F','L','I'], // row 43
  'CDEFGHIK': ['C','G','E','D','H','F','I','K'], // row 44
  'CDEFGHIJ': ['C','G','J','D','H','F','E','I'], // row 45
  'BFGHIJKL': ['H','J','B','F','I','G','L','K'], // row 46
  'BEGHIJKL': ['E','J','I','B','H','G','L','K'], // row 47
  'BEFHIJKL': ['E','J','B','F','I','H','L','K'], // row 48
  'BEFGIJKL': ['E','J','B','F','I','G','L','K'], // row 49
  'BEFGHJKL': ['E','J','B','F','H','G','L','K'], // row 50
  'BEFGHIKL': ['E','G','B','F','I','H','L','K'], // row 51
  'BEFGHIJL': ['E','J','B','F','H','G','L','I'], // row 52
  'BEFGHIJK': ['E','J','B','F','H','G','I','K'], // row 53
  'BDGHIJKL': ['H','J','B','D','I','G','L','K'], // row 54
  'BDFHIJKL': ['H','J','B','D','I','F','L','K'], // row 55
  'BDFGIJKL': ['I','G','B','D','J','F','L','K'], // row 56
  'BDFGHJKL': ['H','G','B','D','J','F','L','K'], // row 57
  'BDFGHIKL': ['H','G','B','D','I','F','L','K'], // row 58
  'BDFGHIJL': ['H','G','B','D','J','F','L','I'], // row 59
  'BDFGHIJK': ['H','G','B','D','J','F','I','K'], // row 60
  'BDEHIJKL': ['E','J','B','D','I','H','L','K'], // row 61
  'BDEGIJKL': ['E','J','B','D','I','G','L','K'], // row 62
  'BDEGHJKL': ['E','J','B','D','H','G','L','K'], // row 63
  'BDEGHIKL': ['E','G','B','D','I','H','L','K'], // row 64
  'BDEGHIJL': ['E','J','B','D','H','G','L','I'], // row 65
  'BDEGHIJK': ['E','J','B','D','H','G','I','K'], // row 66
  'BDEFIJKL': ['E','J','B','D','I','F','L','K'], // row 67
  'BDEFHJKL': ['E','J','B','D','H','F','L','K'], // row 68
  'BDEFHIKL': ['E','I','B','D','H','F','L','K'], // row 69
  'BDEFHIJL': ['E','J','B','D','H','F','L','I'], // row 70
  'BDEFHIJK': ['E','J','B','D','H','F','I','K'], // row 71
  'BDEFGJKL': ['E','G','B','D','J','F','L','K'], // row 72
  'BDEFGIKL': ['E','G','B','D','I','F','L','K'], // row 73
  'BDEFGIJL': ['E','G','B','D','J','F','L','I'], // row 74
  'BDEFGIJK': ['E','G','B','D','J','F','I','K'], // row 75
  'BDEFGHKL': ['E','G','B','D','H','F','L','K'], // row 76
  'BDEFGHJL': ['H','G','B','D','J','F','L','E'], // row 77
  'BDEFGHJK': ['H','G','B','D','J','F','E','K'], // row 78
  'BDEFGHIL': ['E','G','B','D','H','F','L','I'], // row 79
  'BDEFGHIK': ['E','G','B','D','H','F','I','K'], // row 80
  'BDEFGHIJ': ['H','G','B','D','J','F','E','I'], // row 81
  'BCGHIJKL': ['H','J','B','C','I','G','L','K'], // row 82
  'BCFHIJKL': ['H','J','B','C','I','F','L','K'], // row 83
  'BCFGIJKL': ['I','G','B','C','J','F','L','K'], // row 84
  'BCFGHJKL': ['H','G','B','C','J','F','L','K'], // row 85
  'BCFGHIKL': ['H','G','B','C','I','F','L','K'], // row 86
  'BCFGHIJL': ['H','G','B','C','J','F','L','I'], // row 87
  'BCFGHIJK': ['H','G','B','C','J','F','I','K'], // row 88
  'BCEHIJKL': ['E','J','B','C','I','H','L','K'], // row 89
  'BCEGIJKL': ['E','J','B','C','I','G','L','K'], // row 90
  'BCEGHJKL': ['E','J','B','C','H','G','L','K'], // row 91
  'BCEGHIKL': ['E','G','B','C','I','H','L','K'], // row 92
  'BCEGHIJL': ['E','J','B','C','H','G','L','I'], // row 93
  'BCEGHIJK': ['E','J','B','C','H','G','I','K'], // row 94
  'BCEFIJKL': ['E','J','B','C','I','F','L','K'], // row 95
  'BCEFHJKL': ['E','J','B','C','H','F','L','K'], // row 96
  'BCEFHIKL': ['E','I','B','C','H','F','L','K'], // row 97
  'BCEFHIJL': ['E','J','B','C','H','F','L','I'], // row 98
  'BCEFHIJK': ['E','J','B','C','H','F','I','K'], // row 99
  'BCEFGJKL': ['E','G','B','C','J','F','L','K'], // row 100
  'BCEFGIKL': ['E','G','B','C','I','F','L','K'], // row 101
  'BCEFGIJL': ['E','G','B','C','J','F','L','I'], // row 102
  'BCEFGIJK': ['E','G','B','C','J','F','I','K'], // row 103
  'BCEFGHKL': ['E','G','B','C','H','F','L','K'], // row 104
  'BCEFGHJL': ['H','G','B','C','J','F','L','E'], // row 105
  'BCEFGHJK': ['H','G','B','C','J','F','E','K'], // row 106
  'BCEFGHIL': ['E','G','B','C','H','F','L','I'], // row 107
  'BCEFGHIK': ['E','G','B','C','H','F','I','K'], // row 108
  'BCEFGHIJ': ['H','G','B','C','J','F','E','I'], // row 109
  'BCDHIJKL': ['H','J','B','C','I','D','L','K'], // row 110
  'BCDGIJKL': ['I','G','B','C','J','D','L','K'], // row 111
  'BCDGHJKL': ['H','G','B','C','J','D','L','K'], // row 112
  'BCDGHIKL': ['H','G','B','C','I','D','L','K'], // row 113
  'BCDGHIJL': ['H','G','B','C','J','D','L','I'], // row 114
  'BCDGHIJK': ['H','G','B','C','J','D','I','K'], // row 115
  'BCDFIJKL': ['C','J','B','D','I','F','L','K'], // row 116
  'BCDFHJKL': ['C','J','B','D','H','F','L','K'], // row 117
  'BCDFHIKL': ['C','I','B','D','H','F','L','K'], // row 118
  'BCDFHIJL': ['C','J','B','D','H','F','L','I'], // row 119
  'BCDFHIJK': ['C','J','B','D','H','F','I','K'], // row 120
  'BCDFGJKL': ['C','G','B','D','J','F','L','K'], // row 121
  'BCDFGIKL': ['C','G','B','D','I','F','L','K'], // row 122
  'BCDFGIJL': ['C','G','B','D','J','F','L','I'], // row 123
  'BCDFGIJK': ['C','G','B','D','J','F','I','K'], // row 124
  'BCDFGHKL': ['C','G','B','D','H','F','L','K'], // row 125
  'BCDFGHJL': ['C','G','B','D','H','F','L','J'], // row 126
  'BCDFGHJK': ['H','G','B','C','J','F','D','K'], // row 127
  'BCDFGHIL': ['C','G','B','D','H','F','L','I'], // row 128
  'BCDFGHIK': ['C','G','B','D','H','F','I','K'], // row 129
  'BCDFGHIJ': ['H','G','B','C','J','F','D','I'], // row 130
  'BCDEIJKL': ['E','J','B','C','I','D','L','K'], // row 131
  'BCDEHJKL': ['E','J','B','C','H','D','L','K'], // row 132
  'BCDEHIKL': ['E','I','B','C','H','D','L','K'], // row 133
  'BCDEHIJL': ['E','J','B','C','H','D','L','I'], // row 134
  'BCDEHIJK': ['E','J','B','C','H','D','I','K'], // row 135
  'BCDEGJKL': ['E','G','B','C','J','D','L','K'], // row 136
  'BCDEGIKL': ['E','G','B','C','I','D','L','K'], // row 137
  'BCDEGIJL': ['E','G','B','C','J','D','L','I'], // row 138
  'BCDEGIJK': ['E','G','B','C','J','D','I','K'], // row 139
  'BCDEGHKL': ['E','G','B','C','H','D','L','K'], // row 140
  'BCDEGHJL': ['H','G','B','C','J','D','L','E'], // row 141
  'BCDEGHJK': ['H','G','B','C','J','D','E','K'], // row 142
  'BCDEGHIL': ['E','G','B','C','H','D','L','I'], // row 143
  'BCDEGHIK': ['E','G','B','C','H','D','I','K'], // row 144
  'BCDEGHIJ': ['H','G','B','C','J','D','E','I'], // row 145
  'BCDEFJKL': ['C','J','B','D','E','F','L','K'], // row 146
  'BCDEFIKL': ['C','E','B','D','I','F','L','K'], // row 147
  'BCDEFIJL': ['C','J','B','D','E','F','L','I'], // row 148
  'BCDEFIJK': ['C','J','B','D','E','F','I','K'], // row 149
  'BCDEFHKL': ['C','E','B','D','H','F','L','K'], // row 150
  'BCDEFHJL': ['C','J','B','D','H','F','L','E'], // row 151
  'BCDEFHJK': ['C','J','B','D','H','F','E','K'], // row 152
  'BCDEFHIL': ['C','E','B','D','H','F','L','I'], // row 153
  'BCDEFHIK': ['C','E','B','D','H','F','I','K'], // row 154
  'BCDEFHIJ': ['C','J','B','D','H','F','E','I'], // row 155
  'BCDEFGKL': ['C','G','B','D','E','F','L','K'], // row 156
  'BCDEFGJL': ['C','G','B','D','J','F','L','E'], // row 157
  'BCDEFGJK': ['C','G','B','D','J','F','E','K'], // row 158
  'BCDEFGIL': ['C','G','B','D','E','F','L','I'], // row 159
  'BCDEFGIK': ['C','G','B','D','E','F','I','K'], // row 160
  'BCDEFGIJ': ['C','G','B','D','J','F','E','I'], // row 161
  'BCDEFGHL': ['C','G','B','D','H','F','L','E'], // row 162
  'BCDEFGHK': ['C','G','B','D','H','F','E','K'], // row 163
  'BCDEFGHJ': ['H','G','B','C','J','F','D','E'], // row 164
  'BCDEFGHI': ['C','G','B','D','H','F','E','I'], // row 165
  'AFGHIJKL': ['H','J','I','F','A','G','L','K'], // row 166
  'AEGHIJKL': ['E','J','I','A','H','G','L','K'], // row 167
  'AEFHIJKL': ['E','J','I','F','A','H','L','K'], // row 168
  'AEFGIJKL': ['E','J','I','F','A','G','L','K'], // row 169
  'AEFGHJKL': ['E','G','J','F','A','H','L','K'], // row 170
  'AEFGHIKL': ['E','G','I','F','A','H','L','K'], // row 171
  'AEFGHIJL': ['E','G','J','F','A','H','L','I'], // row 172
  'AEFGHIJK': ['E','G','J','F','A','H','I','K'], // row 173
  'ADGHIJKL': ['H','J','I','D','A','G','L','K'], // row 174
  'ADFHIJKL': ['H','J','I','D','A','F','L','K'], // row 175
  'ADFGIJKL': ['I','G','J','D','A','F','L','K'], // row 176
  'ADFGHJKL': ['H','G','J','D','A','F','L','K'], // row 177
  'ADFGHIKL': ['H','G','I','D','A','F','L','K'], // row 178
  'ADFGHIJL': ['H','G','J','D','A','F','L','I'], // row 179
  'ADFGHIJK': ['H','G','J','D','A','F','I','K'], // row 180
  'ADEHIJKL': ['E','J','I','D','A','H','L','K'], // row 181
  'ADEGIJKL': ['E','J','I','D','A','G','L','K'], // row 182
  'ADEGHJKL': ['E','G','J','D','A','H','L','K'], // row 183
  'ADEGHIKL': ['E','G','I','D','A','H','L','K'], // row 184
  'ADEGHIJL': ['E','G','J','D','A','H','L','I'], // row 185
  'ADEGHIJK': ['E','G','J','D','A','H','I','K'], // row 186
  'ADEFIJKL': ['E','J','I','D','A','F','L','K'], // row 187
  'ADEFHJKL': ['H','J','E','D','A','F','L','K'], // row 188
  'ADEFHIKL': ['H','E','I','D','A','F','L','K'], // row 189
  'ADEFHIJL': ['H','J','E','D','A','F','L','I'], // row 190
  'ADEFHIJK': ['H','J','E','D','A','F','I','K'], // row 191
  'ADEFGJKL': ['E','G','J','D','A','F','L','K'], // row 192
  'ADEFGIKL': ['E','G','I','D','A','F','L','K'], // row 193
  'ADEFGIJL': ['E','G','J','D','A','F','L','I'], // row 194
  'ADEFGIJK': ['E','G','J','D','A','F','I','K'], // row 195
  'ADEFGHKL': ['H','G','E','D','A','F','L','K'], // row 196
  'ADEFGHJL': ['H','G','J','D','A','F','L','E'], // row 197
  'ADEFGHJK': ['H','G','J','D','A','F','E','K'], // row 198
  'ADEFGHIL': ['H','G','E','D','A','F','L','I'], // row 199
  'ADEFGHIK': ['H','G','E','D','A','F','I','K'], // row 200
  'ADEFGHIJ': ['H','G','J','D','A','F','E','I'], // row 201
  'ACGHIJKL': ['H','J','I','C','A','G','L','K'], // row 202
  'ACFHIJKL': ['H','J','I','C','A','F','L','K'], // row 203
  'ACFGIJKL': ['I','G','J','C','A','F','L','K'], // row 204
  'ACFGHJKL': ['H','G','J','C','A','F','L','K'], // row 205
  'ACFGHIKL': ['H','G','I','C','A','F','L','K'], // row 206
  'ACFGHIJL': ['H','G','J','C','A','F','L','I'], // row 207
  'ACFGHIJK': ['H','G','J','C','A','F','I','K'], // row 208
  'ACEHIJKL': ['E','J','I','C','A','H','L','K'], // row 209
  'ACEGIJKL': ['E','J','I','C','A','G','L','K'], // row 210
  'ACEGHJKL': ['E','G','J','C','A','H','L','K'], // row 211
  'ACEGHIKL': ['E','G','I','C','A','H','L','K'], // row 212
  'ACEGHIJL': ['E','G','J','C','A','H','L','I'], // row 213
  'ACEGHIJK': ['E','G','J','C','A','H','I','K'], // row 214
  'ACEFIJKL': ['E','J','I','C','A','F','L','K'], // row 215
  'ACEFHJKL': ['H','J','E','C','A','F','L','K'], // row 216
  'ACEFHIKL': ['H','E','I','C','A','F','L','K'], // row 217
  'ACEFHIJL': ['H','J','E','C','A','F','L','I'], // row 218
  'ACEFHIJK': ['H','J','E','C','A','F','I','K'], // row 219
  'ACEFGJKL': ['E','G','J','C','A','F','L','K'], // row 220
  'ACEFGIKL': ['E','G','I','C','A','F','L','K'], // row 221
  'ACEFGIJL': ['E','G','J','C','A','F','L','I'], // row 222
  'ACEFGIJK': ['E','G','J','C','A','F','I','K'], // row 223
  'ACEFGHKL': ['H','G','E','C','A','F','L','K'], // row 224
  'ACEFGHJL': ['H','G','J','C','A','F','L','E'], // row 225
  'ACEFGHJK': ['H','G','J','C','A','F','E','K'], // row 226
  'ACEFGHIL': ['H','G','E','C','A','F','L','I'], // row 227
  'ACEFGHIK': ['H','G','E','C','A','F','I','K'], // row 228
  'ACEFGHIJ': ['H','G','J','C','A','F','E','I'], // row 229
  'ACDHIJKL': ['H','J','I','C','A','D','L','K'], // row 230
  'ACDGIJKL': ['I','G','J','C','A','D','L','K'], // row 231
  'ACDGHJKL': ['H','G','J','C','A','D','L','K'], // row 232
  'ACDGHIKL': ['H','G','I','C','A','D','L','K'], // row 233
  'ACDGHIJL': ['H','G','J','C','A','D','L','I'], // row 234
  'ACDGHIJK': ['H','G','J','C','A','D','I','K'], // row 235
  'ACDFIJKL': ['C','J','I','D','A','F','L','K'], // row 236
  'ACDFHJKL': ['H','J','F','C','A','D','L','K'], // row 237
  'ACDFHIKL': ['H','F','I','C','A','D','L','K'], // row 238
  'ACDFHIJL': ['H','J','F','C','A','D','L','I'], // row 239
  'ACDFHIJK': ['H','J','F','C','A','D','I','K'], // row 240
  'ACDFGJKL': ['C','G','J','D','A','F','L','K'], // row 241
  'ACDFGIKL': ['C','G','I','D','A','F','L','K'], // row 242
  'ACDFGIJL': ['C','G','J','D','A','F','L','I'], // row 243
  'ACDFGIJK': ['C','G','J','D','A','F','I','K'], // row 244
  'ACDFGHKL': ['H','G','F','C','A','D','L','K'], // row 245
  'ACDFGHJL': ['C','G','J','D','A','F','L','H'], // row 246
  'ACDFGHJK': ['H','G','J','C','A','F','D','K'], // row 247
  'ACDFGHIL': ['H','G','F','C','A','D','L','I'], // row 248
  'ACDFGHIK': ['H','G','F','C','A','D','I','K'], // row 249
  'ACDFGHIJ': ['H','G','J','C','A','F','D','I'], // row 250
  'ACDEIJKL': ['E','J','I','C','A','D','L','K'], // row 251
  'ACDEHJKL': ['H','J','E','C','A','D','L','K'], // row 252
  'ACDEHIKL': ['H','E','I','C','A','D','L','K'], // row 253
  'ACDEHIJL': ['H','J','E','C','A','D','L','I'], // row 254
  'ACDEHIJK': ['H','J','E','C','A','D','I','K'], // row 255
  'ACDEGJKL': ['E','G','J','C','A','D','L','K'], // row 256
  'ACDEGIKL': ['E','G','I','C','A','D','L','K'], // row 257
  'ACDEGIJL': ['E','G','J','C','A','D','L','I'], // row 258
  'ACDEGIJK': ['E','G','J','C','A','D','I','K'], // row 259
  'ACDEGHKL': ['H','G','E','C','A','D','L','K'], // row 260
  'ACDEGHJL': ['H','G','J','C','A','D','L','E'], // row 261
  'ACDEGHJK': ['H','G','J','C','A','D','E','K'], // row 262
  'ACDEGHIL': ['H','G','E','C','A','D','L','I'], // row 263
  'ACDEGHIK': ['H','G','E','C','A','D','I','K'], // row 264
  'ACDEGHIJ': ['H','G','J','C','A','D','E','I'], // row 265
  'ACDEFJKL': ['C','J','E','D','A','F','L','K'], // row 266
  'ACDEFIKL': ['C','E','I','D','A','F','L','K'], // row 267
  'ACDEFIJL': ['C','J','E','D','A','F','L','I'], // row 268
  'ACDEFIJK': ['C','J','E','D','A','F','I','K'], // row 269
  'ACDEFHKL': ['H','E','F','C','A','D','L','K'], // row 270
  'ACDEFHJL': ['H','J','F','C','A','D','L','E'], // row 271
  'ACDEFHJK': ['H','J','E','C','A','F','D','K'], // row 272
  'ACDEFHIL': ['H','E','F','C','A','D','L','I'], // row 273
  'ACDEFHIK': ['H','E','F','C','A','D','I','K'], // row 274
  'ACDEFHIJ': ['H','J','E','C','A','F','D','I'], // row 275
  'ACDEFGKL': ['C','G','E','D','A','F','L','K'], // row 276
  'ACDEFGJL': ['C','G','J','D','A','F','L','E'], // row 277
  'ACDEFGJK': ['C','G','J','D','A','F','E','K'], // row 278
  'ACDEFGIL': ['C','G','E','D','A','F','L','I'], // row 279
  'ACDEFGIK': ['C','G','E','D','A','F','I','K'], // row 280
  'ACDEFGIJ': ['C','G','J','D','A','F','E','I'], // row 281
  'ACDEFGHL': ['H','G','F','C','A','D','L','E'], // row 282
  'ACDEFGHK': ['H','G','E','C','A','F','D','K'], // row 283
  'ACDEFGHJ': ['H','G','J','C','A','F','D','E'], // row 284
  'ACDEFGHI': ['H','G','E','C','A','F','D','I'], // row 285
  'ABGHIJKL': ['H','J','B','A','I','G','L','K'], // row 286
  'ABFHIJKL': ['H','J','B','A','I','F','L','K'], // row 287
  'ABFGIJKL': ['I','J','B','F','A','G','L','K'], // row 288
  'ABFGHJKL': ['H','J','B','F','A','G','L','K'], // row 289
  'ABFGHIKL': ['H','G','B','A','I','F','L','K'], // row 290
  'ABFGHIJL': ['H','J','B','F','A','G','L','I'], // row 291
  'ABFGHIJK': ['H','J','B','F','A','G','I','K'], // row 292
  'ABEHIJKL': ['E','J','B','A','I','H','L','K'], // row 293
  'ABEGIJKL': ['E','J','B','A','I','G','L','K'], // row 294
  'ABEGHJKL': ['E','J','B','A','H','G','L','K'], // row 295
  'ABEGHIKL': ['E','G','B','A','I','H','L','K'], // row 296
  'ABEGHIJL': ['E','J','B','A','H','G','L','I'], // row 297
  'ABEGHIJK': ['E','J','B','A','H','G','I','K'], // row 298
  'ABEFIJKL': ['E','J','B','A','I','F','L','K'], // row 299
  'ABEFHJKL': ['E','J','B','F','A','H','L','K'], // row 300
  'ABEFHIKL': ['E','I','B','F','A','H','L','K'], // row 301
  'ABEFHIJL': ['E','J','B','F','A','H','L','I'], // row 302
  'ABEFHIJK': ['E','J','B','F','A','H','I','K'], // row 303
  'ABEFGJKL': ['E','J','B','F','A','G','L','K'], // row 304
  'ABEFGIKL': ['E','G','B','A','I','F','L','K'], // row 305
  'ABEFGIJL': ['E','J','B','F','A','G','L','I'], // row 306
  'ABEFGIJK': ['E','J','B','F','A','G','I','K'], // row 307
  'ABEFGHKL': ['E','G','B','F','A','H','L','K'], // row 308
  'ABEFGHJL': ['H','J','B','F','A','G','L','E'], // row 309
  'ABEFGHJK': ['H','J','B','F','A','G','E','K'], // row 310
  'ABEFGHIL': ['E','G','B','F','A','H','L','I'], // row 311
  'ABEFGHIK': ['E','G','B','F','A','H','I','K'], // row 312
  'ABEFGHIJ': ['H','J','B','F','A','G','E','I'], // row 313
  'ABDHIJKL': ['I','J','B','D','A','H','L','K'], // row 314
  'ABDGIJKL': ['I','J','B','D','A','G','L','K'], // row 315
  'ABDGHJKL': ['H','J','B','D','A','G','L','K'], // row 316
  'ABDGHIKL': ['I','G','B','D','A','H','L','K'], // row 317
  'ABDGHIJL': ['H','J','B','D','A','G','L','I'], // row 318
  'ABDGHIJK': ['H','J','B','D','A','G','I','K'], // row 319
  'ABDFIJKL': ['I','J','B','D','A','F','L','K'], // row 320
  'ABDFHJKL': ['H','J','B','D','A','F','L','K'], // row 321
  'ABDFHIKL': ['H','I','B','D','A','F','L','K'], // row 322
  'ABDFHIJL': ['H','J','B','D','A','F','L','I'], // row 323
  'ABDFHIJK': ['H','J','B','D','A','F','I','K'], // row 324
  'ABDFGJKL': ['F','J','B','D','A','G','L','K'], // row 325
  'ABDFGIKL': ['I','G','B','D','A','F','L','K'], // row 326
  'ABDFGIJL': ['F','J','B','D','A','G','L','I'], // row 327
  'ABDFGIJK': ['F','J','B','D','A','G','I','K'], // row 328
  'ABDFGHKL': ['H','G','B','D','A','F','L','K'], // row 329
  'ABDFGHJL': ['H','G','B','D','A','F','L','J'], // row 330
  'ABDFGHJK': ['H','G','B','D','A','F','J','K'], // row 331
  'ABDFGHIL': ['H','G','B','D','A','F','L','I'], // row 332
  'ABDFGHIK': ['H','G','B','D','A','F','I','K'], // row 333
  'ABDFGHIJ': ['H','G','B','D','A','F','I','J'], // row 334
  'ABDEIJKL': ['E','J','B','A','I','D','L','K'], // row 335
  'ABDEHJKL': ['E','J','B','D','A','H','L','K'], // row 336
  'ABDEHIKL': ['E','I','B','D','A','H','L','K'], // row 337
  'ABDEHIJL': ['E','J','B','D','A','H','L','I'], // row 338
  'ABDEHIJK': ['E','J','B','D','A','H','I','K'], // row 339
  'ABDEGJKL': ['E','J','B','D','A','G','L','K'], // row 340
  'ABDEGIKL': ['E','G','B','A','I','D','L','K'], // row 341
  'ABDEGIJL': ['E','J','B','D','A','G','L','I'], // row 342
  'ABDEGIJK': ['E','J','B','D','A','G','I','K'], // row 343
  'ABDEGHKL': ['E','G','B','D','A','H','L','K'], // row 344
  'ABDEGHJL': ['H','J','B','D','A','G','L','E'], // row 345
  'ABDEGHJK': ['H','J','B','D','A','G','E','K'], // row 346
  'ABDEGHIL': ['E','G','B','D','A','H','L','I'], // row 347
  'ABDEGHIK': ['E','G','B','D','A','H','I','K'], // row 348
  'ABDEGHIJ': ['H','J','B','D','A','G','E','I'], // row 349
  'ABDEFJKL': ['E','J','B','D','A','F','L','K'], // row 350
  'ABDEFIKL': ['E','I','B','D','A','F','L','K'], // row 351
  'ABDEFIJL': ['E','J','B','D','A','F','L','I'], // row 352
  'ABDEFIJK': ['E','J','B','D','A','F','I','K'], // row 353
  'ABDEFHKL': ['H','E','B','D','A','F','L','K'], // row 354
  'ABDEFHJL': ['H','J','B','D','A','F','L','E'], // row 355
  'ABDEFHJK': ['H','J','B','D','A','F','E','K'], // row 356
  'ABDEFHIL': ['H','E','B','D','A','F','L','I'], // row 357
  'ABDEFHIK': ['H','E','B','D','A','F','I','K'], // row 358
  'ABDEFHIJ': ['H','J','B','D','A','F','E','I'], // row 359
  'ABDEFGKL': ['E','G','B','D','A','F','L','K'], // row 360
  'ABDEFGJL': ['E','G','B','D','A','F','L','J'], // row 361
  'ABDEFGJK': ['E','G','B','D','A','F','J','K'], // row 362
  'ABDEFGIL': ['E','G','B','D','A','F','L','I'], // row 363
  'ABDEFGIK': ['E','G','B','D','A','F','I','K'], // row 364
  'ABDEFGIJ': ['E','G','B','D','A','F','I','J'], // row 365
  'ABDEFGHL': ['H','G','B','D','A','F','L','E'], // row 366
  'ABDEFGHK': ['H','G','B','D','A','F','E','K'], // row 367
  'ABDEFGHJ': ['H','G','B','D','A','F','E','J'], // row 368
  'ABDEFGHI': ['H','G','B','D','A','F','E','I'], // row 369
  'ABCHIJKL': ['I','J','B','C','A','H','L','K'], // row 370
  'ABCGIJKL': ['I','J','B','C','A','G','L','K'], // row 371
  'ABCGHJKL': ['H','J','B','C','A','G','L','K'], // row 372
  'ABCGHIKL': ['I','G','B','C','A','H','L','K'], // row 373
  'ABCGHIJL': ['H','J','B','C','A','G','L','I'], // row 374
  'ABCGHIJK': ['H','J','B','C','A','G','I','K'], // row 375
  'ABCFIJKL': ['I','J','B','C','A','F','L','K'], // row 376
  'ABCFHJKL': ['H','J','B','C','A','F','L','K'], // row 377
  'ABCFHIKL': ['H','I','B','C','A','F','L','K'], // row 378
  'ABCFHIJL': ['H','J','B','C','A','F','L','I'], // row 379
  'ABCFHIJK': ['H','J','B','C','A','F','I','K'], // row 380
  'ABCFGJKL': ['C','J','B','F','A','G','L','K'], // row 381
  'ABCFGIKL': ['I','G','B','C','A','F','L','K'], // row 382
  'ABCFGIJL': ['C','J','B','F','A','G','L','I'], // row 383
  'ABCFGIJK': ['C','J','B','F','A','G','I','K'], // row 384
  'ABCFGHKL': ['H','G','B','C','A','F','L','K'], // row 385
  'ABCFGHJL': ['H','G','B','C','A','F','L','J'], // row 386
  'ABCFGHJK': ['H','G','B','C','A','F','J','K'], // row 387
  'ABCFGHIL': ['H','G','B','C','A','F','L','I'], // row 388
  'ABCFGHIK': ['H','G','B','C','A','F','I','K'], // row 389
  'ABCFGHIJ': ['H','G','B','C','A','F','I','J'], // row 390
  'ABCEIJKL': ['E','J','B','A','I','C','L','K'], // row 391
  'ABCEHJKL': ['E','J','B','C','A','H','L','K'], // row 392
  'ABCEHIKL': ['E','I','B','C','A','H','L','K'], // row 393
  'ABCEHIJL': ['E','J','B','C','A','H','L','I'], // row 394
  'ABCEHIJK': ['E','J','B','C','A','H','I','K'], // row 395
  'ABCEGJKL': ['E','J','B','C','A','G','L','K'], // row 396
  'ABCEGIKL': ['E','G','B','A','I','C','L','K'], // row 397
  'ABCEGIJL': ['E','J','B','C','A','G','L','I'], // row 398
  'ABCEGIJK': ['E','J','B','C','A','G','I','K'], // row 399
  'ABCEGHKL': ['E','G','B','C','A','H','L','K'], // row 400
  'ABCEGHJL': ['H','J','B','C','A','G','L','E'], // row 401
  'ABCEGHJK': ['H','J','B','C','A','G','E','K'], // row 402
  'ABCEGHIL': ['E','G','B','C','A','H','L','I'], // row 403
  'ABCEGHIK': ['E','G','B','C','A','H','I','K'], // row 404
  'ABCEGHIJ': ['H','J','B','C','A','G','E','I'], // row 405
  'ABCEFJKL': ['E','J','B','C','A','F','L','K'], // row 406
  'ABCEFIKL': ['E','I','B','C','A','F','L','K'], // row 407
  'ABCEFIJL': ['E','J','B','C','A','F','L','I'], // row 408
  'ABCEFIJK': ['E','J','B','C','A','F','I','K'], // row 409
  'ABCEFHKL': ['H','E','B','C','A','F','L','K'], // row 410
  'ABCEFHJL': ['H','J','B','C','A','F','L','E'], // row 411
  'ABCEFHJK': ['H','J','B','C','A','F','E','K'], // row 412
  'ABCEFHIL': ['H','E','B','C','A','F','L','I'], // row 413
  'ABCEFHIK': ['H','E','B','C','A','F','I','K'], // row 414
  'ABCEFHIJ': ['H','J','B','C','A','F','E','I'], // row 415
  'ABCEFGKL': ['E','G','B','C','A','F','L','K'], // row 416
  'ABCEFGJL': ['E','G','B','C','A','F','L','J'], // row 417
  'ABCEFGJK': ['E','G','B','C','A','F','J','K'], // row 418
  'ABCEFGIL': ['E','G','B','C','A','F','L','I'], // row 419
  'ABCEFGIK': ['E','G','B','C','A','F','I','K'], // row 420
  'ABCEFGIJ': ['E','G','B','C','A','F','I','J'], // row 421
  'ABCEFGHL': ['H','G','B','C','A','F','L','E'], // row 422
  'ABCEFGHK': ['H','G','B','C','A','F','E','K'], // row 423
  'ABCEFGHJ': ['H','G','B','C','A','F','E','J'], // row 424
  'ABCEFGHI': ['H','G','B','C','A','F','E','I'], // row 425
  'ABCDIJKL': ['I','J','B','C','A','D','L','K'], // row 426
  'ABCDHJKL': ['H','J','B','C','A','D','L','K'], // row 427
  'ABCDHIKL': ['H','I','B','C','A','D','L','K'], // row 428
  'ABCDHIJL': ['H','J','B','C','A','D','L','I'], // row 429
  'ABCDHIJK': ['H','J','B','C','A','D','I','K'], // row 430
  'ABCDGJKL': ['C','J','B','D','A','G','L','K'], // row 431
  'ABCDGIKL': ['I','G','B','C','A','D','L','K'], // row 432
  'ABCDGIJL': ['C','J','B','D','A','G','L','I'], // row 433
  'ABCDGIJK': ['C','J','B','D','A','G','I','K'], // row 434
  'ABCDGHKL': ['H','G','B','C','A','D','L','K'], // row 435
  'ABCDGHJL': ['H','G','B','C','A','D','L','J'], // row 436
  'ABCDGHJK': ['H','G','B','C','A','D','J','K'], // row 437
  'ABCDGHIL': ['H','G','B','C','A','D','L','I'], // row 438
  'ABCDGHIK': ['H','G','B','C','A','D','I','K'], // row 439
  'ABCDGHIJ': ['H','G','B','C','A','D','I','J'], // row 440
  'ABCDFJKL': ['C','J','B','D','A','F','L','K'], // row 441
  'ABCDFIKL': ['C','I','B','D','A','F','L','K'], // row 442
  'ABCDFIJL': ['C','J','B','D','A','F','L','I'], // row 443
  'ABCDFIJK': ['C','J','B','D','A','F','I','K'], // row 444
  'ABCDFHKL': ['H','F','B','C','A','D','L','K'], // row 445
  'ABCDFHJL': ['C','J','B','D','A','F','L','H'], // row 446
  'ABCDFHJK': ['H','J','B','C','A','F','D','K'], // row 447
  'ABCDFHIL': ['H','F','B','C','A','D','L','I'], // row 448
  'ABCDFHIK': ['H','F','B','C','A','D','I','K'], // row 449
  'ABCDFHIJ': ['H','J','B','C','A','F','D','I'], // row 450
  'ABCDFGKL': ['C','G','B','D','A','F','L','K'], // row 451
  'ABCDFGJL': ['C','G','B','D','A','F','L','J'], // row 452
  'ABCDFGJK': ['C','G','B','D','A','F','J','K'], // row 453
  'ABCDFGIL': ['C','G','B','D','A','F','L','I'], // row 454
  'ABCDFGIK': ['C','G','B','D','A','F','I','K'], // row 455
  'ABCDFGIJ': ['C','G','B','D','A','F','I','J'], // row 456
  'ABCDFGHL': ['C','G','B','D','A','F','L','H'], // row 457
  'ABCDFGHK': ['H','G','B','C','A','F','D','K'], // row 458
  'ABCDFGHJ': ['H','G','B','C','A','F','D','J'], // row 459
  'ABCDFGHI': ['H','G','B','C','A','F','D','I'], // row 460
  'ABCDEJKL': ['E','J','B','C','A','D','L','K'], // row 461
  'ABCDEIKL': ['E','I','B','C','A','D','L','K'], // row 462
  'ABCDEIJL': ['E','J','B','C','A','D','L','I'], // row 463
  'ABCDEIJK': ['E','J','B','C','A','D','I','K'], // row 464
  'ABCDEHKL': ['H','E','B','C','A','D','L','K'], // row 465
  'ABCDEHJL': ['H','J','B','C','A','D','L','E'], // row 466
  'ABCDEHJK': ['H','J','B','C','A','D','E','K'], // row 467
  'ABCDEHIL': ['H','E','B','C','A','D','L','I'], // row 468
  'ABCDEHIK': ['H','E','B','C','A','D','I','K'], // row 469
  'ABCDEHIJ': ['H','J','B','C','A','D','E','I'], // row 470
  'ABCDEGKL': ['E','G','B','C','A','D','L','K'], // row 471
  'ABCDEGJL': ['E','G','B','C','A','D','L','J'], // row 472
  'ABCDEGJK': ['E','G','B','C','A','D','J','K'], // row 473
  'ABCDEGIL': ['E','G','B','C','A','D','L','I'], // row 474
  'ABCDEGIK': ['E','G','B','C','A','D','I','K'], // row 475
  'ABCDEGIJ': ['E','G','B','C','A','D','I','J'], // row 476
  'ABCDEGHL': ['H','G','B','C','A','D','L','E'], // row 477
  'ABCDEGHK': ['H','G','B','C','A','D','E','K'], // row 478
  'ABCDEGHJ': ['H','G','B','C','A','D','E','J'], // row 479
  'ABCDEGHI': ['H','G','B','C','A','D','E','I'], // row 480
  'ABCDEFKL': ['C','E','B','D','A','F','L','K'], // row 481
  'ABCDEFJL': ['C','J','B','D','A','F','L','E'], // row 482
  'ABCDEFJK': ['C','J','B','D','A','F','E','K'], // row 483
  'ABCDEFIL': ['C','E','B','D','A','F','L','I'], // row 484
  'ABCDEFIK': ['C','E','B','D','A','F','I','K'], // row 485
  'ABCDEFIJ': ['C','J','B','D','A','F','E','I'], // row 486
  'ABCDEFHL': ['H','F','B','C','A','D','L','E'], // row 487
  'ABCDEFHK': ['H','E','B','C','A','F','D','K'], // row 488
  'ABCDEFHJ': ['H','J','B','C','A','F','D','E'], // row 489
  'ABCDEFHI': ['H','E','B','C','A','F','D','I'], // row 490
  'ABCDEFGL': ['C','G','B','D','A','F','L','E'], // row 491
  'ABCDEFGK': ['C','G','B','D','A','F','E','K'], // row 492
  'ABCDEFGJ': ['C','G','B','D','A','F','E','J'], // row 493
  'ABCDEFGI': ['C','G','B','D','A','F','E','I'], // row 494
  'ABCDEFGH': ['H','G','B','C','A','F','D','E'], // row 495
}

// Match number → which Annex C column (which winner) that 3rd-place slot feeds
const ANNEX_C_MATCH_TO_COL = { 79:0, 85:1, 81:2, 74:3, 82:4, 77:5, 87:6, 80:7 }

/**
 * Given the top-8 qualifying 3rd-place groups, return a map of
 * matchNumber → team name for each 3rd-place R32 slot.
 */
function resolveAnnexC(top8groups, tables) {
  const key = [...top8groups].sort().join('')
  const entry = ANNEX_C[key]
  if (!entry) return {}  // should never happen with valid top-8 input
  // entry[col] = group letter whose 3rd-place team goes into that match
  const result = {}
  for (const [matchNum, col] of Object.entries(ANNEX_C_MATCH_TO_COL)) {
    const groupLetter = entry[col]
    result[Number(matchNum)] = tables[groupLetter]?.[2]?.team ?? 'TBD'
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
//  BRACKET RESOLUTION
//
//  resolveTeam(slotCode, tables, allThirds, annexMap, predictions, fixturesByMatchNum)
//  resolves any slot code to a team name:
//    "1A"        → group A winner
//    "2B"        → group B runner-up
//    "3ABCDF"    → the 3rd-place team assigned to this match via Annex C
//                  (looked up by match number of the fixture containing this slot)
//    "W73"       → winner of match 73 (recursively resolved)
//    "L101"      → loser of match 101 (recursively resolved)
// ─────────────────────────────────────────────────────────────────────────────

function resolveTeam(slotCode, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, depth = 0) {
  if (!slotCode || depth > 10) return 'TBD'

  // Group winner / runner-up
  if (/^[12][A-L]$/.test(slotCode)) {
    const pos = slotCode[0] === '1' ? 0 : 1
    return tables[slotCode[1]]?.[pos]?.team ?? 'TBD'
  }

  // 3rd-place slot (e.g. "3ABCDF") — resolved via Annex C annexMap
  // annexMap is keyed by the match_number of the fixture containing this slot
  // We need to find which fixture has this slotCode and use its match_number
  if (/^3[A-L]{2,}$/.test(slotCode)) {
    // annexMap is keyed by match number → team name, pre-computed
    // We look up by match number from the fixture context
    // This is handled by the caller passing the correct match number
    return null  // signal to caller to use match-number lookup
  }

  // Winner of match N
  if (slotCode.startsWith('W')) {
    const matchNum = parseInt(slotCode.slice(1))
    const fixture = fixturesByMatchNum[matchNum]
    if (!fixture) return 'TBD'
    const pred = koPredictions[fixture.id]
    if (!pred || pred.home == null || pred.away == null) return 'TBD'
    const t1 = resolveFixtureTeam(fixture.slot1, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, depth + 1)
    const t2 = resolveFixtureTeam(fixture.slot2, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, depth + 1)
    return pred.home > pred.away ? t1 : pred.away > pred.home ? t2 : 'TBD'
  }

  // Loser of match N
  if (slotCode.startsWith('L')) {
    const matchNum = parseInt(slotCode.slice(1))
    const fixture = fixturesByMatchNum[matchNum]
    if (!fixture) return 'TBD'
    const pred = koPredictions[fixture.id]
    if (!pred || pred.home == null || pred.away == null) return 'TBD'
    const t1 = resolveFixtureTeam(fixture.slot1, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, depth + 1)
    const t2 = resolveFixtureTeam(fixture.slot2, fixture.match_number, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, depth + 1)
    return pred.away > pred.home ? t1 : pred.home > pred.away ? t2 : 'TBD'
  }

  return 'TBD'
}

// Resolve a slot code in the context of a specific fixture's match number
// This handles the 3rd-place slot codes by using the annexMap
function resolveFixtureTeam(slotCode, matchNum, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, depth = 0) {
  if (!slotCode || depth > 10) return 'TBD'

  // 3rd-place slot — use annexMap keyed by this fixture's match number
  if (/^3[A-L]{2,}$/.test(slotCode)) {
    return annexMap[matchNum] ?? 'TBD'
  }

  return resolveTeam(slotCode, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum, depth)
}

/**
 * Build the complete bracket resolution context from current predictions.
 * Returns annexMap (matchNum → 3rd-place team) and tables.
 */
function buildBracketContext(groupPredictions, fixtures, tables) {
  const allThirds = calcAllThirds(tables)
  const top8 = allThirds.slice(0, 8)
  const top8groups = top8.map(t => t.group)
  const annexMap = resolveAnnexC(top8groups, tables)
  return { annexMap, allThirds }
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function FlagImg({ team, className = 'w-5 h-3' }) {
  const src = flag(team)
  if (!src) return null
  return <img src={src} alt={team} className={`${className} object-cover rounded-sm flex-shrink-0`} />
}

function TeamCell({ team, align = 'left' }) {
  const isRight = align === 'right'
  return (
    <span className={`font-medium text-white flex items-center gap-1 flex-nowrap ${isRight ? 'justify-end' : ''}`}>
      {isRight && <span className="hidden sm:inline text-sm">{team}</span>}
      {isRight && <span className="sm:hidden text-xs">{shortName(team)}</span>}
      <FlagImg team={team} />
      {!isRight && <span className="hidden sm:inline text-sm">{team}</span>}
      {!isRight && <span className="sm:hidden text-xs">{shortName(team)}</span>}
    </span>
  )
}

function ScoreInput({ value, onChange, disabled }) {
  const empty = value == null || value === ''
  const highlight = !disabled && empty
  return (
    <input
      type="number" min="0" max="99"
      value={value ?? ''} placeholder="–"
      disabled={disabled}
      className={`w-9 text-center py-1 rounded-md text-sm font-bold outline-none transition-colors
        ${disabled
          ? 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
          : highlight
            ? 'bg-yellow-500/10 border border-yellow-500/50 text-white'
            : 'bg-gray-700 border border-gray-600 text-white'
        }`}
      onChange={e => onChange(e.target.value === '' ? null : parseInt(e.target.value))}
    />
  )
}

function GroupTablePanel({ predictions, fixtures, activeGroup }) {
  const [selectedGroup, setSelectedGroup] = useState(null)
  const displayGroup = selectedGroup || (activeGroup === 'ALL' ? 'A' : activeGroup)
  const tables = calcGroupTables(predictions, fixtures)
  const allThirds = calcAllThirds(tables)

  return (
    <div className="p-4 overflow-y-auto">
      <h3 className="font-bold text-yellow-400 mb-3 text-sm uppercase tracking-wider">Group Tables</h3>
      <div className="flex flex-wrap gap-1 mb-4">
        {GROUPS.map(g => (
          <button key={g} onClick={() => setSelectedGroup(g)}
            className={`text-xs px-2 py-1 rounded font-bold transition-colors
              ${displayGroup === g ? 'bg-yellow-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {g}
          </button>
        ))}
      </div>

      {/* Selected group table */}
      <div className="bg-gray-900 rounded-xl overflow-hidden mb-4">
        <div className="bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-400 uppercase tracking-wider">
          Group {displayGroup}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-3 py-2 text-gray-500">#</th>
              <th className="text-left px-3 py-2 text-gray-500">Team</th>
              <th className="px-2 py-2 text-gray-500">P</th>
              <th className="px-2 py-2 text-gray-500">GD</th>
              <th className="px-2 py-2 text-gray-500">Pts</th>
            </tr>
          </thead>
          <tbody>
            {(tables[displayGroup] || []).map((row, i) => (
              <tr key={row.team} className={`border-b border-gray-800/50 ${i < 2 ? 'bg-green-500/5' : ''}`}>
                <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-white">
                  <span className="flex items-center gap-1">
                    <FlagImg team={row.team} />
                    <span className="truncate max-w-24">{row.team}</span>
                    {i < 2 && <span className="text-green-400 text-xs">✓</span>}
                  </span>
                </td>
                <td className="px-2 py-2 text-center text-gray-400">{row.played}</td>
                <td className={`px-2 py-2 text-center ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {row.gd > 0 ? '+' : ''}{row.gd}
                </td>
                <td className="px-2 py-2 text-center font-bold text-yellow-400">{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Best 3rd place table */}
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <div className="bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-400 uppercase tracking-wider">
          Best 3rd Place (Top 8 Advance)
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-3 py-2 text-gray-500">#</th>
              <th className="text-left px-3 py-2 text-gray-500">Team</th>
              <th className="px-2 py-2 text-gray-500">Grp</th>
              <th className="px-2 py-2 text-gray-500">GD</th>
              <th className="px-2 py-2 text-gray-500">Pts</th>
            </tr>
          </thead>
          <tbody>
            {allThirds.map((row, i) => (
              <tr key={row.group} className={`border-b border-gray-800/50 ${i < 8 ? 'bg-yellow-500/5' : 'opacity-50'}`}>
                <td className="px-3 py-2 text-gray-500">{i + 1}{i < 8 ? ' ✓' : ''}</td>
                <td className="px-3 py-2 font-medium text-white">
                  <span className="flex items-center gap-1">
                    <FlagImg team={row.team} />
                    <span className="truncate max-w-20">{row.team}</span>
                  </span>
                </td>
                <td className="px-2 py-2 text-center text-yellow-400 font-bold">{row.group}</td>
                <td className={`px-2 py-2 text-center ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {row.gd > 0 ? '+' : ''}{row.gd}
                </td>
                <td className="px-2 py-2 text-center font-bold text-yellow-400">{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  BRACKET MODAL
// ─────────────────────────────────────────────────────────────────────────────

function BracketModal({ onClose, fixtures, groupPredictions, koPredictions, tables, annexMap, fixturesByMatchNum }) {
  const koFixtures = fixtures.filter(f => f.round !== 'group')

  const resolveSlot = (slotCode, matchNum) =>
    resolveFixtureTeam(slotCode, matchNum, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum)

  const getWinner = (f) => {
    const pred = koPredictions[f.id]
    if (!pred || pred.home == null || pred.away == null || pred.home === pred.away) return null
    const t1 = resolveSlot(f.slot1 || f.home_team, f.match_number)
    const t2 = resolveSlot(f.slot2 || f.away_team, f.match_number)
    return pred.home > pred.away ? t1 : t2
  }

  // Build match card
  const MatchCard = ({ f, compact = false }) => {
    if (!f) return <div className="w-44 h-16 rounded-lg bg-gray-800/40 border border-gray-700/30" />
    const pred = koPredictions[f.id] || {}
    const t1 = resolveSlot(f.slot1 || f.home_team, f.match_number)
    const t2 = resolveSlot(f.slot2 || f.away_team, f.match_number)
    const winner = getWinner(f)
    const hasPred = pred.home != null && pred.away != null
    const isTbd1 = t1 === 'TBD'
    const isTbd2 = t2 === 'TBD'

    const TeamRow = ({ team, score, isWinner, isTbd }) => (
      <div className={`flex items-center justify-between px-2 py-1 rounded
        ${isWinner ? 'bg-yellow-500/15' : ''}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          {!isTbd && <FlagImg team={team} className="w-4 h-3 flex-shrink-0" />}
          <span className={`text-xs truncate max-w-[90px] ${isTbd ? 'text-gray-600 italic' : isWinner ? 'text-yellow-300 font-bold' : 'text-gray-300'}`}>
            {isTbd ? 'TBD' : team}
          </span>
        </div>
        <span className={`text-xs font-bold ml-1 flex-shrink-0 ${isWinner ? 'text-yellow-400' : hasPred ? 'text-gray-400' : 'text-gray-700'}`}>
          {hasPred ? score : '–'}
        </span>
      </div>
    )

    return (
      <div className={`w-44 bg-gray-900 border rounded-lg overflow-hidden flex-shrink-0
        ${hasPred ? 'border-gray-600' : 'border-gray-700/50'}`}>
        <div className="px-2 pt-1 pb-0.5 text-[10px] text-gray-600 border-b border-gray-800">
          M{f.match_number}
        </div>
        <div className="p-1 space-y-0.5">
          <TeamRow team={t1} score={pred.home} isWinner={winner === t1 && !isTbd1} isTbd={isTbd1} />
          <TeamRow team={t2} score={pred.away} isWinner={winner === t2 && !isTbd2} isTbd={isTbd2} />
        </div>
      </div>
    )
  }

  const rounds = ['R32', 'R16', 'QF', 'SF', 'FINAL']
  const roundLabels = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter Finals', SF: 'Semi Finals', FINAL: 'Final' }
  const bronze = koFixtures.find(f => f.round === '3RD')

  // For each round, get fixtures in match_number order
  const roundFixtures = (round) => koFixtures.filter(f => f.round === round).sort((a, b) => a.match_number - b.match_number)

  // Connector line heights — used to visually pair matches between rounds
  // R32 has 16 matches → R16 has 8 → QF 4 → SF 2 → F 1
  // Each match card is ~80px tall, gap between pairs creates the tree structure

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950 flex-shrink-0"
        onClick={e => e.stopPropagation()}>
        <div>
          <h2 className="font-bold text-white">🏆 My Predicted Bracket</h2>
          <p className="text-xs text-gray-500 mt-0.5">Based on your current predictions · winner highlighted in gold</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl px-2">✕</button>
      </div>

      {/* Scrollable bracket area */}
      <div className="flex-1 overflow-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex gap-6 items-start min-w-max">

          {rounds.map((round, roundIdx) => {
            const fs = roundFixtures(round)
            // Card height + gap unit. Each successive round doubles the slot height.
            const CARD_H = 80   // px — approximate rendered height of one MatchCard
            const BASE_GAP = 8  // px — gap between cards in R32
            const slotH = (CARD_H + BASE_GAP) * Math.pow(2, roundIdx)

            return (
              <div key={round} className="flex flex-col flex-shrink-0">
                {/* Round label */}
                <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 text-center w-44">
                  {roundLabels[round]}
                </div>
                {/* Match cards — each sits in a slot of slotH, centred vertically */}
                <div className="flex flex-col">
                  {fs.map((f) => (
                    <div key={f.id}
                      style={{ height: `${slotH}px` }}
                      className="flex items-center">
                      <MatchCard f={f} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Bronze play-off — separate column, aligned at top */}
          {bronze && (
            <div className="flex flex-col flex-shrink-0 opacity-75 ml-4">
              <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 text-center w-44">
                Bronze Final
              </div>
              <div style={{ height: `${(80 + 8) * 8}px` }} className="flex items-start pt-2">
                <MatchCard f={bronze} />
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/15 inline-block border border-yellow-500/30" /> predicted winner</span>
          <span className="flex items-center gap-1"><span className="text-gray-600 italic">TBD</span> = team not yet determined from your predictions</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PredictionsClient({
  league, fixtures, existingPredictions,
  extrasPrediction, userId, profile, leagueId
}) {
  const locked = isLocked()
  const [activeGroup, setActiveGroup] = useState('A')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [toast, setToast] = useState(null)
  const [showMobileTables, setShowMobileTables] = useState(false)
  const [showBracketModal, setShowBracketModal] = useState(false)
  const [starPickRound, setStarPickRound] = useState(null) // which round's picker is open
  const saveTimers = useRef({})
  const supabaseRef = useRef(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  const [groupPredictions, setGroupPredictions] = useState(() => {
    const map = {}
    for (const p of existingPredictions.filter(p => {
      const f = fixtures.find(f => f.id === p.fixture_id)
      return f?.round === 'group'
    })) {
      map[p.fixture_id] = { home: p.predicted_home, away: p.predicted_away }
    }
    return map
  })

  const [koPredictions, setKoPredictions] = useState(() => {
    const map = {}
    for (const p of existingPredictions.filter(p => {
      const f = fixtures.find(f => f.id === p.fixture_id)
      return f?.round !== 'group'
    })) {
      map[p.fixture_id] = { home: p.predicted_home, away: p.predicted_away }
    }
    return map
  })

  const [extras, setExtras] = useState({
    redcards: extrasPrediction?.predicted_red_cards ?? null,
    goals: extrasPrediction?.predicted_total_goals ?? null,
  })
  const [starPicks, setStarPicks] = useState({
    group: extrasPrediction?.star_pick_group ?? null,
    R32:   extrasPrediction?.star_pick_r32   ?? null,
    R16:   extrasPrediction?.star_pick_r16   ?? null,
    QF:    extrasPrediction?.star_pick_qf    ?? null,
    SF:    extrasPrediction?.star_pick_sf    ?? null,
    FINAL: extrasPrediction?.star_pick_final ?? null,
  })

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const savePrediction = useCallback(async (fixtureId, home, away) => {
    if (locked) return
    setSaveStatus('saving')
    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: userId, league_id: leagueId, fixture_id: fixtureId,
        predicted_home: home, predicted_away: away,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,league_id,fixture_id' })
    if (error) showToast('Save failed', 'error')
    else setSaveStatus('saved')
  }, [locked, userId, leagueId, supabase])

  const updateGroupPrediction = (fixtureId, side, value) => {
    if (locked) return
    setGroupPredictions(prev => {
      const updated = { ...prev, [fixtureId]: { ...(prev[fixtureId] || {}), [side]: value } }
      const p = updated[fixtureId]
      if (p.home != null && p.away != null) {
        setSaveStatus('unsaved')
        clearTimeout(saveTimers.current[fixtureId])
        saveTimers.current[fixtureId] = setTimeout(() => savePrediction(fixtureId, p.home, p.away), 800)
      }
      return updated
    })
  }

  const updateKoPrediction = (fixtureId, side, value) => {
    if (locked) return
    setKoPredictions(prev => {
      const updated = { ...prev, [fixtureId]: { ...(prev[fixtureId] || {}), [side]: value } }
      const p = updated[fixtureId]
      if (p.home != null && p.away != null) {
        setSaveStatus('unsaved')
        clearTimeout(saveTimers.current[fixtureId])
        saveTimers.current[fixtureId] = setTimeout(() => savePrediction(fixtureId, p.home, p.away), 800)
      }
      return updated
    })
  }

  const saveExtras = async (newExtras, newStarPicks) => {
    const { error } = await supabase
      .from('extras_predictions')
      .upsert({
        user_id: userId, league_id: leagueId,
        predicted_red_cards: newExtras.redcards,
        predicted_total_goals: newExtras.goals,
        star_pick_group: newStarPicks.group,
        star_pick_r32:   newStarPicks.R32,
        star_pick_r16:   newStarPicks.R16,
        star_pick_qf:    newStarPicks.QF,
        star_pick_sf:    newStarPicks.SF,
        star_pick_final: newStarPicks.FINAL,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,league_id' })
    if (!error) showToast('Saved ✓')
    else showToast('Save failed', 'error')
  }

  const saveStarPick = async (round, team) => {
    const newStarPicks = { ...starPicks, [round]: team }
    setStarPicks(newStarPicks)
    setStarPickRound(null)
    const colMap = { group: 'star_pick_group', R32: 'star_pick_r32', R16: 'star_pick_r16', QF: 'star_pick_qf', SF: 'star_pick_sf', FINAL: 'star_pick_final' }
    const { error } = await supabase
      .from('extras_predictions')
      .upsert({
        user_id: userId, league_id: leagueId,
        [colMap[round]]: team,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,league_id' })
    if (error) showToast('Save failed', 'error')
    else showToast(`⭐ Star pick saved for ${roundLabels[round] || round}`)
  }

  // ── Derived bracket state (recomputed on every prediction change) ──────────

  const groupFixtures    = fixtures.filter(f => f.round === 'group')
  const koFixtures       = fixtures.filter(f => f.round !== 'group')
  const filteredFixtures = activeGroup === 'ALL' ? groupFixtures : groupFixtures.filter(f => f.match_group === activeGroup)

  const totalGroupPredictions = groupFixtures.filter(f => {
    const p = groupPredictions[f.id]
    return p?.home != null && p?.away != null
  }).length

  const totalKoPredictions = koFixtures.filter(f => {
    const p = koPredictions[f.id]
    return p?.home != null && p?.away != null
  }).length

  const totalPredictions = totalGroupPredictions + totalKoPredictions
  const progressPct = Math.round((totalGroupPredictions / 72) * 100)

  // Build fixture index by match_number for KO resolution
  const fixturesByMatchNum = {}
  for (const f of fixtures) {
    if (f.match_number) fixturesByMatchNum[f.match_number] = f
  }

  // Group tables — update live as group predictions change
  const tables = calcGroupTables(groupPredictions, fixtures)

  // Annex C — build from current top-8 thirds
  const { annexMap } = buildBracketContext(groupPredictions, fixtures, tables)

  // Resolve a team for a given slot code + the fixture's match number context
  const resolve = (slotCode, matchNum) =>
    resolveFixtureTeam(slotCode, matchNum, tables, annexMap, groupPredictions, koPredictions, fixturesByMatchNum)

  // ── Per-round star pick helpers ──────────────────────────────────────────────

  // Lock time for each round = kickoff of first fixture in that round
  const roundLockTimes = {}
  const starPickRounds = ['group', 'R32', 'R16', 'QF', 'SF', 'FINAL']
  for (const round of starPickRounds) {
    const key = round === 'group' ? 'group' : round
    const roundFs = fixtures.filter(f => f.round === (round === 'group' ? 'group' : round))
    if (roundFs.length) {
      const earliest = roundFs.reduce((a, b) => new Date(a.kickoff_utc) < new Date(b.kickoff_utc) ? a : b)
      roundLockTimes[round] = new Date(earliest.kickoff_utc)
    }
  }
  const isRoundLocked = (round) => {
    const lockTime = roundLockTimes[round]
    return lockTime ? new Date() >= lockTime : false
  }

  // Teams available for star pick per round — derived from bracket resolution
  const teamsForRound = (round) => {
    if (round === 'group') return Object.values(GROUP_TEAMS).flat().sort()
    const roundFs = koFixtures.filter(f => f.round === round)
    const teams = new Set()
    for (const f of roundFs) {
      const t1 = resolve(f.slot1 || f.home_team, f.match_number)
      const t2 = resolve(f.slot2 || f.away_team, f.match_number)
      if (t1 && t1 !== 'TBD') teams.add(t1)
      if (t2 && t2 !== 'TBD') teams.add(t2)
    }
    return [...teams].sort()
  }

  // Check if a star pick is still valid (team is in the predicted bracket for that round)
  const isStarPickValid = (round, team) => {
    if (!team) return true
    if (round === 'group') return true // all 48 always valid
    return teamsForRound(round).includes(team)
  }

  const roundLabels = {
    R32:'Round of 32', R16:'Round of 16', QF:'Quarter Finals',
    SF:'Semi Finals', '3RD':'Bronze Final', FINAL:'The Final'
  }
  const roundOrder = ['R32','R16','QF','SF','3RD','FINAL']

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <Link href={`/dashboard/league/${leagueId}`} className="text-gray-400 hover:text-white text-sm">
          ← {league?.league_name}
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span title="Group stage">{totalGroupPredictions}/72</span>
            <span className="text-gray-700">·</span>
            <span title="Knockout stage">{totalKoPredictions}/32 KO</span>
            <span className="text-gray-700">·</span>
            <span className={totalPredictions === 104 ? 'text-green-400 font-medium' : ''}>{totalPredictions}/104</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-green-400' : saveStatus === 'saving' ? 'bg-yellow-400' : 'bg-red-400'}`}/>
            <span className="text-xs text-gray-500">
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
            </span>
          </div>
          <div className={`text-xs px-2 py-1 rounded-full font-medium ${locked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
            {locked ? '🔒 Locked' : '🔓 Open'}
          </div>
        </div>
      </nav>

      <div className="flex">
        <div className="flex-1 p-4 pb-24 overflow-x-auto">

          {/* Progress */}
          <div className="mb-4 space-y-2">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Group stage</span>
                <span>{totalGroupPredictions}/72 · {progressPct}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }}/>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Knockout stage</span>
                <span>{totalKoPredictions}/32 · {Math.round((totalKoPredictions / 32) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${Math.round((totalKoPredictions / 32) * 100)}%` }}/>
              </div>
            </div>
          </div>

          {/* Group tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {GROUPS.map(g => {
              const done = groupFixtures.filter(f => f.match_group === g)
                .every(f => { const p = groupPredictions[f.id]; return p?.home != null && p?.away != null })
              return (
                <button key={g} onClick={() => setActiveGroup(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                    ${activeGroup === g ? 'bg-yellow-500 text-gray-950'
                      : done ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {g} {done ? '✓' : ''}
                </button>
              )
            })}
            <button onClick={() => setActiveGroup('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                ${activeGroup === 'ALL' ? 'bg-yellow-500 text-gray-950' : 'bg-gray-800 text-gray-400'}`}>
              All
            </button>
          </div>

          {/* Group match table */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-yellow-500/5">
                  <th className="px-2 py-2 text-right text-xs text-gray-500">Home</th>
                  <th className="px-1 py-2 text-center text-xs text-gray-500 w-9">H</th>
                  <th className="px-1 py-2 text-center text-xs text-gray-500 w-4">–</th>
                  <th className="px-1 py-2 text-center text-xs text-gray-500 w-9">A</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-500">Away</th>
                  <th className="px-2 py-2 text-right text-xs text-gray-500 hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredFixtures.map(f => {
                  const pred = groupPredictions[f.id] || {}
                  return (
                    <tr key={f.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-2 py-2 text-right">
                        <TeamCell team={f.home_team} align="right" />
                      </td>
                      <td className="px-1 py-2 text-center">
                        <ScoreInput value={pred.home} onChange={v => updateGroupPrediction(f.id, 'home', v)} disabled={locked}/>
                      </td>
                      <td className="px-1 py-2 text-center text-gray-600 font-bold">–</td>
                      <td className="px-1 py-2 text-center">
                        <ScoreInput value={pred.away} onChange={v => updateGroupPrediction(f.id, 'away', v)} disabled={locked}/>
                      </td>
                      <td className="px-2 py-2">
                        <TeamCell team={f.away_team} align="left" />
                      </td>
                      <td className="px-2 py-2 text-right text-xs text-gray-600 hidden md:table-cell whitespace-nowrap">
                        {new Date(f.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* KO bracket — always shown, TBD until teams are known */}
          <div className="mt-8">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-yellow-400 text-sm font-medium">⚡ Knockout bracket</p>
                <p className="text-gray-500 text-xs mt-1">
                  Teams update live as you enter predictions. Complete all 72 group matches to finalise the R32 draw.
                  Enter a score for each KO match to advance teams to the next round.
                </p>
              </div>
              <button
                onClick={() => setShowBracketModal(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                🏆 View bracket
              </button>
            </div>

            {roundOrder.map(round => {
              const roundFixtures = koFixtures.filter(f => f.round === round)
              return (
                <div key={round} className="mt-5">
                  <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 pb-2 border-b border-gray-800">
                    {roundLabels[round]}
                  </div>
                  <div className="bg-gray-900 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        {roundFixtures.map(f => {
                          const pred = koPredictions[f.id] || {}
                          const t1 = resolve(f.slot1 || f.home_team, f.match_number)
                          const t2 = resolve(f.slot2 || f.away_team, f.match_number)
                          const hasDraw = pred.home != null && pred.away != null && pred.home === pred.away
                          return (
                            <tr key={f.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                              <td className="px-2 py-2 text-right">
                                {t1 === 'TBD'
                                  ? <span className="text-gray-600 text-xs italic">TBD</span>
                                  : <TeamCell team={t1} align="right" />}
                              </td>
                              <td className="px-1 py-2 text-center">
                                <ScoreInput value={pred.home} onChange={v => updateKoPrediction(f.id, 'home', v)} disabled={locked}/>
                              </td>
                              <td className="px-1 py-2 text-center text-gray-600 font-bold">–</td>
                              <td className="px-1 py-2 text-center">
                                <ScoreInput value={pred.away} onChange={v => updateKoPrediction(f.id, 'away', v)} disabled={locked}/>
                              </td>
                              <td className="px-2 py-2">
                                {t2 === 'TBD'
                                  ? <span className="text-gray-600 text-xs italic">TBD</span>
                                  : <TeamCell team={t2} align="left" />}
                              </td>
                              <td className="px-2 py-2 text-right hidden md:table-cell">
                                {hasDraw && (
                                  <span className="text-xs text-amber-400">Draw? Give winner +1 (pens)</span>
                                )}
                                {!hasDraw && (
                                  <span className="text-xs text-gray-600 whitespace-nowrap">
                                    {new Date(f.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Star Picks — per round */}
          <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-sm">⭐ Star Team — per round</h3>
            </div>
            <p className="text-gray-500 text-xs mb-4">Pick a team per round — their points are doubled. Locks when the first match of each round kicks off.</p>
            <div className="space-y-2">
              {[
                { round: 'group', label: 'Group Stage' },
                { round: 'R32',   label: 'Round of 32' },
                { round: 'R16',   label: 'Round of 16' },
                { round: 'QF',    label: 'Quarter Finals' },
                { round: 'SF',    label: 'Semi Finals' },
                { round: 'FINAL', label: 'The Final' },
              ].map(({ round, label }) => {
                const pick = starPicks[round]
                const roundLocked = isRoundLocked(round)
                const valid = isStarPickValid(round, pick)
                const availableTeams = teamsForRound(round)
                const noTeamsYet = round !== 'group' && availableTeams.length === 0
                return (
                  <div key={round} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border
                    ${roundLocked ? 'border-gray-800 bg-gray-800/30 opacity-60' : 'border-gray-700 bg-gray-800/40'}`}>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-300">{label}</p>
                      {roundLocked && <p className="text-xs text-gray-600">Locked</p>}
                      {!roundLocked && noTeamsYet && <p className="text-xs text-gray-600">Fill in predictions to unlock teams</p>}
                      {!valid && pick && <p className="text-xs text-amber-400">⚠ {pick} not in your predicted {label}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {pick && (
                        <div className="flex items-center gap-1.5">
                          <FlagImg team={pick} />
                          <span className="text-xs text-yellow-400 font-medium">{pick}</span>
                        </div>
                      )}
                      {!roundLocked && (
                        <button
                          onClick={() => setStarPickRound(round)}
                          disabled={noTeamsYet}
                          className="text-xs px-2.5 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                          {pick ? 'Change' : 'Pick'}
                        </button>
                      )}
                      {!roundLocked && pick && (
                        <button
                          onClick={() => saveStarPick(round, null)}
                          className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Extras */}
          <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="font-bold text-lg mb-1">🎯 Tournament Extras</h3>
            <p className="text-gray-500 text-sm mb-4">Closest answer wins 50 points each</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Total Red Cards</label>
                <input type="number" min="0" value={extras.redcards ?? ''} disabled={locked} placeholder="e.g. 24"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                  onChange={e => setExtras(prev => ({ ...prev, redcards: e.target.value === '' ? null : parseInt(e.target.value) }))}/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Total Goals (excl. pens)</label>
                <input type="number" min="0" value={extras.goals ?? ''} disabled={locked} placeholder="e.g. 142"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                  onChange={e => setExtras(prev => ({ ...prev, goals: e.target.value === '' ? null : parseInt(e.target.value) }))}/>
              </div>
            </div>
            {!locked && (
              <button onClick={() => saveExtras(extras, starPicks)}
                className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-lg text-sm transition-colors">
                Save Extras
              </button>
            )}
          </div>

        </div>

        {/* Mobile tables button */}
        <div className="lg:hidden fixed bottom-16 right-4 z-30">
          <button onClick={() => setShowMobileTables(prev => !prev)}
            className="bg-yellow-500 text-gray-950 font-bold rounded-full px-4 py-2 text-sm shadow-lg">
            📊 Tables
          </button>
        </div>

        {/* Mobile tables drawer */}
        {showMobileTables && (
          <div className="lg:hidden fixed inset-0 bg-gray-950 z-40 overflow-y-auto pb-20">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <span className="font-bold text-yellow-400">Group Tables</span>
              <button onClick={() => setShowMobileTables(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <GroupTablePanel predictions={groupPredictions} fixtures={fixtures} activeGroup={activeGroup}/>
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="hidden lg:block w-72 border-l border-gray-800 bg-gray-900/50">
          <GroupTablePanel predictions={groupPredictions} fixtures={fixtures} activeGroup={activeGroup}/>
        </div>
      </div>

      {/* Star pick modal — per round */}
      {starPickRound && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setStarPickRound(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg">⭐ Star Pick</h3>
              <button onClick={() => setStarPickRound(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {starPickRound === 'group' ? 'Group Stage' :
               starPickRound === 'R32' ? 'Round of 32' :
               starPickRound === 'R16' ? 'Round of 16' :
               starPickRound === 'QF' ? 'Quarter Finals' :
               starPickRound === 'SF' ? 'Semi Finals' : 'The Final'} — points doubled for this team's match
            </p>
            {(() => {
              const teams = teamsForRound(starPickRound)
              const current = starPicks[starPickRound]
              if (teams.length === 0) return (
                <p className="text-gray-500 text-sm text-center py-4">No teams resolved yet — fill in your predictions first.</p>
              )
              return (
                <div className="grid grid-cols-2 gap-2">
                  {teams.map(team => (
                    <button key={team}
                      onClick={() => saveStarPick(starPickRound, team)}
                      className={`px-3 py-2 rounded-lg text-sm text-left flex items-center gap-2 transition-colors
                        ${current === team ? 'bg-yellow-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                      <FlagImg team={team} />
                      <span className="truncate">{team}</span>
                    </button>
                  ))}
                </div>
              )
            })()}
            {starPicks[starPickRound] && (
              <button onClick={() => saveStarPick(starPickRound, null)}
                className="w-full mt-3 py-2 bg-red-900/30 text-red-400 rounded-lg text-sm hover:bg-red-900/50 transition-colors">
                Remove Star Pick
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bracket modal */}
      {showBracketModal && (
        <BracketModal
          onClose={() => setShowBracketModal(false)}
          fixtures={fixtures}
          groupPredictions={groupPredictions}
          koPredictions={koPredictions}
          tables={tables}
          annexMap={annexMap}
          fixturesByMatchNum={fixturesByMatchNum}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50
          ${toast.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}