// ─── lib/worldcup.js ──────────────────────────────────────────────────────────
// Single source of truth for all 2026 FIFA World Cup constants.
// Import from here in PredictionsClient.js, ResultsClient.js,
// TournamentBracketClient.js, and standings/page.js
// ─────────────────────────────────────────────────────────────────────────────

// ── Groups & Teams ────────────────────────────────────────────────────────────

export const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export const GROUP_TEAMS = {
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

// Flat array of all 48 teams — avoids repeated Object.values(GROUP_TEAMS).flat()
export const ALL_TEAMS = Object.values(GROUP_TEAMS).flat()

// ── Flags ─────────────────────────────────────────────────────────────────────

export const COUNTRY_CODES = {
  // Group A
  'Mexico': 'mx', 'South Africa': 'za', 'South Korea': 'kr', 'Czechia': 'cz',
  // Group B
  'Canada': 'ca', 'Bosnia-Herzegovina': 'ba', 'Qatar': 'qa', 'Switzerland': 'ch',
  // Group C
  'Brazil': 'br', 'Morocco': 'ma', 'Haiti': 'ht', 'Scotland': 'gb-sct',
  // Group D
  'USA': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Türkiye': 'tr',
  // Group E
  'Germany': 'de', 'Curaçao': 'cw', 'Ivory Coast': 'ci', 'Ecuador': 'ec',
  // Group F
  'Netherlands': 'nl', 'Japan': 'jp', 'Tunisia': 'tn', 'Sweden': 'se',
  // Group G
  'Belgium': 'be', 'Iran': 'ir', 'Egypt': 'eg', 'New Zealand': 'nz',
  // Group H
  'Spain': 'es', 'Uruguay': 'uy', 'Saudi Arabia': 'sa', 'Cape Verde': 'cv',
  // Group I
  'France': 'fr', 'Senegal': 'sn', 'Norway': 'no', 'Iraq': 'iq',
  // Group J
  'Argentina': 'ar', 'Algeria': 'dz', 'Austria': 'at', 'Jordan': 'jo',
  // Group K
  'Portugal': 'pt', 'Colombia': 'co', 'Uzbekistan': 'uz', 'DR Congo': 'cd',
  // Group L
  'England': 'gb-eng', 'Croatia': 'hr', 'Panama': 'pa', 'Ghana': 'gh',
}

// Returns a flag image URL for a given team name, or null if not found
export const flagUrl = (team, size = '24x18') => {
  const code = COUNTRY_CODES[team]
  return code ? `https://flagcdn.com/${size}/${code}.png` : null
}

// ── Short names (mobile display) ──────────────────────────────────────────────

const SHORT_NAME_MAP = {
  'South Africa':       'S Africa',
  'South Korea':        'S Korea',
  'Bosnia-Herzegovina': 'Bosnia',
  'Switzerland':        'Swiss',
  'Australia':          'Austral',
  'Ivory Coast':        'C Ivoire',
  'Netherlands':        'Nether',
  'New Zealand':        'NZ',
  'Saudi Arabia':       'S Arabia',
  'Cape Verde':         'C Verde',
  'DR Congo':           'DR Congo',
}

export const shortName = (name) =>
  SHORT_NAME_MAP[name] || (name.length > 8 ? name.slice(0, 7) : name)

// ── Round metadata ────────────────────────────────────────────────────────────

export const ROUND_LABELS = {
  group: 'Group Stage',
  R32:   'Round of 32',
  R16:   'Round of 16',
  QF:    'Quarter Finals',
  SF:    'Semi Finals',
  '3RD': 'Bronze Final',
  FINAL: 'The Final',
}

// Ordered list of KO rounds (excludes group)
export const KO_ROUNDS = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL']

// Match number boundaries for each round
export const MATCH_RANGES = {
  group: [1,   72],
  R32:   [73,  88],
  R16:   [89,  96],
  QF:    [97,  100],
  SF:    [101, 102],
  '3RD': [103, 103],
  FINAL: [104, 104],
}

// ── Star pick column names ────────────────────────────────────────────────────
// Maps round code → extras_predictions column name

export const STAR_PICK_COLUMNS = {
  group: 'star_pick_group',
  R32:   'star_pick_r32',
  R16:   'star_pick_r16',
  QF:    'star_pick_qf',
  SF:    'star_pick_sf',
  FINAL: 'star_pick_final',
  // Bronze uses the FINAL pick
  '3RD': 'star_pick_final',
}

// ── Annex C (3rd place slot assignments) ─────────────────────────────────────
// Key: sorted string of the 8 qualifying group letters
// Value: array of 8 group letters, one per Annex C R32 match slot
// Column order: [1A_opp, 1B_opp, 1D_opp, 1E_opp, 1G_opp, 1I_opp, 1K_opp, 1L_opp]
// Match number → column index mapping:
//   { 79:0, 85:1, 81:2, 74:3, 82:4, 77:5, 87:6, 80:7 }

export const ANNEX_C = {
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