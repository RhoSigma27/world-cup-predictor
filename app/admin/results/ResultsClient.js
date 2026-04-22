'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

// ─── constants ────────────────────────────────────────────────────────────────

const COUNTRY_CODES = {
  'Mexico':'mx','South Africa':'za','South Korea':'kr','Czechia':'cz',
  'Canada':'ca','Italy':'it','Qatar':'qa','Switzerland':'ch',
  'Brazil':'br','Morocco':'ma','Scotland':'gb-sct','Haiti':'ht',
  'USA':'us','Paraguay':'py','Australia':'au','Türkiye':'tr',
  'Germany':'de','Portugal':'pt','Colombia':'co','Uzbekistan':'uz',
  'Argentina':'ar','Belgium':'be','Slovenia':'si','Egypt':'eg',
  'Netherlands':'nl','Chile':'cl','Iran':'ir','Curaçao':'cw',
  'Spain':'es','Japan':'jp','Venezuela':'ve','Algeria':'dz',
  'France':'fr','Senegal':'sn','Norway':'no','Iraq':'iq',
  'Uruguay':'uy',"Côte d'Ivoire":'ci','Poland':'pl','Cabo Verde':'cv',
  'Serbia':'rs','New Zealand':'nz','Denmark':'dk','Kenya':'ke',
  'England':'gb-eng','Croatia':'hr','Ghana':'gh','Panama':'pa',
}
const flag = t => {
  const code = COUNTRY_CODES[t]
  return code ? `https://flagcdn.com/24x18/${code}.png` : null
}

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

const GROUP_TEAMS = {
  A:['Mexico','South Africa','South Korea','Czechia'],
  B:['Canada','Italy','Qatar','Switzerland'],
  C:['Brazil','Morocco','Scotland','Haiti'],
  D:['USA','Paraguay','Australia','Türkiye'],
  E:['Germany','Portugal','Colombia','Uzbekistan'],
  F:['Argentina','Belgium','Slovenia','Egypt'],
  G:['Netherlands','Chile','Iran','Curaçao'],
  H:['Spain','Japan','Venezuela','Algeria'],
  I:['France','Senegal','Norway','Iraq'],
  J:['Uruguay',"Côte d'Ivoire",'Poland','Cabo Verde'],
  K:['Serbia','New Zealand','Denmark','Kenya'],
  L:['England','Croatia','Ghana','Panama'],
}

const ROUND_LABELS = {
  R32:'Round of 32', R16:'Round of 16', QF:'Quarter Finals',
  SF:'Semi Finals', '3RD':'Bronze Final', FINAL:'The Final',
}

// ─── Annex C ─────────────────────────────────────────────────────────────────
// col order: [1A_opp, 1B_opp, 1D_opp, 1E_opp, 1G_opp, 1I_opp, 1K_opp, 1L_opp]
// match number → Annex C column index
const ANNEX_C_MATCH_TO_COL = { 79:0, 85:1, 81:2, 74:3, 82:4, 77:5, 87:6, 80:7 }

const ANNEX_C = {
  'EFGHIJKL': ['E','J','I','F','H','G','L','K'],
  'DFGHIJKL': ['H','G','I','D','J','F','L','K'],
  'DEGHIJKL': ['E','J','I','D','H','G','L','K'],
  'DEFHIJKL': ['E','J','I','D','H','F','L','K'],
  'DEFGIJKL': ['E','G','I','D','J','F','L','K'],
  'DEFGHJKL': ['E','G','J','D','H','F','L','K'],
  'DEFGHIKL': ['E','G','I','D','H','F','L','K'],
  'DEFGHIJL': ['E','G','J','D','H','F','L','I'],
  'DEFGHIJK': ['E','G','J','D','H','F','I','K'],
  'CFGHIJKL': ['H','G','I','C','J','F','L','K'],
  'CEGHIJKL': ['E','J','I','C','H','G','L','K'],
  'CEFHIJKL': ['E','J','I','C','H','F','L','K'],
  'CEFGIJKL': ['E','G','I','C','J','F','L','K'],
  'CEFGHJKL': ['E','G','J','C','H','F','L','K'],
  'CEFGHIKL': ['E','G','I','C','H','F','L','K'],
  'CEFGHIJL': ['E','G','J','C','H','F','L','I'],
  'CEFGHIJK': ['E','G','J','C','H','F','I','K'],
  'CDGHIJKL': ['H','G','I','C','J','D','L','K'],
  'CDFHIJKL': ['C','J','I','D','H','F','L','K'],
  'CDFGIJKL': ['C','G','I','D','J','F','L','K'],
  'CDFGHJKL': ['C','G','J','D','H','F','L','K'],
  'CDFGHIKL': ['C','G','I','D','H','F','L','K'],
  'CDFGHIJL': ['C','G','J','D','H','F','L','I'],
  'CDFGHIJK': ['C','G','J','D','H','F','I','K'],
  'CDEHIJKL': ['E','J','I','C','H','D','L','K'],
  'CDEGIJKL': ['E','G','I','C','J','D','L','K'],
  'CDEGHJKL': ['E','G','J','C','H','D','L','K'],
  'CDEGHIKL': ['E','G','I','C','H','D','L','K'],
  'CDEGHIJL': ['E','G','J','C','H','D','L','I'],
  'CDEGHIJK': ['E','G','J','C','H','D','I','K'],
  'CDEFIJKL': ['C','J','E','D','I','F','L','K'],
  'CDEFHJKL': ['C','J','E','D','H','F','L','K'],
  'CDEFHIKL': ['C','E','I','D','H','F','L','K'],
  'CDEFHIJL': ['C','J','E','D','H','F','L','I'],
  'CDEFHIJK': ['C','J','E','D','H','F','I','K'],
  'CDEFGJKL': ['C','G','E','D','J','F','L','K'],
  'CDEFGIKL': ['C','G','E','D','I','F','L','K'],
  'CDEFGIJL': ['C','G','E','D','J','F','L','I'],
  'CDEFGIJK': ['C','G','E','D','J','F','I','K'],
  'CDEFGHKL': ['C','G','E','D','H','F','L','K'],
  'CDEFGHJL': ['C','G','J','D','H','F','L','E'],
  'CDEFGHJK': ['C','G','J','D','H','F','E','K'],
  'CDEFGHIL': ['C','G','E','D','H','F','L','I'],
  'CDEFGHIK': ['C','G','E','D','H','F','I','K'],
  'CDEFGHIJ': ['C','G','J','D','H','F','E','I'],
  'BFGHIJKL': ['H','J','B','F','I','G','L','K'],
  'BEGHIJKL': ['E','J','I','B','H','G','L','K'],
  'BEFHIJKL': ['E','J','B','F','I','H','L','K'],
  'BEFGIJKL': ['E','J','B','F','I','G','L','K'],
  'BEFGHJKL': ['E','J','B','F','H','G','L','K'],
  'BEFGHIKL': ['E','G','B','F','I','H','L','K'],
  'BEFGHIJL': ['E','J','B','F','H','G','L','I'],
  'BEFGHIJK': ['E','J','B','F','H','G','I','K'],
  'BDGHIJKL': ['H','J','B','D','I','G','L','K'],
  'BDFHIJKL': ['H','J','B','D','I','F','L','K'],
  'BDFGIJKL': ['I','G','B','D','J','F','L','K'],
  'BDFGHJKL': ['H','G','B','D','J','F','L','K'],
  'BDFGHIKL': ['H','G','B','D','I','F','L','K'],
  'BDFGHIJL': ['H','G','B','D','J','F','L','I'],
  'BDFGHIJK': ['H','G','B','D','J','F','I','K'],
  'BDEHIJKL': ['E','J','B','D','I','H','L','K'],
  'BDEGIJKL': ['E','J','B','D','I','G','L','K'],
  'BDEGHJKL': ['E','J','B','D','H','G','L','K'],
  'BDEGHIKL': ['E','G','B','D','I','H','L','K'],
  'BDEGHIJL': ['E','J','B','D','H','G','L','I'],
  'BDEGHIJK': ['E','J','B','D','H','G','I','K'],
  'BDEFIJKL': ['E','J','B','D','I','F','L','K'],
  'BDEFHJKL': ['E','J','B','D','H','F','L','K'],
  'BDEFHIKL': ['E','I','B','D','H','F','L','K'],
  'BDEFHIJL': ['E','J','B','D','H','F','L','I'],
  'BDEFHIJK': ['E','J','B','D','H','F','I','K'],
  'BDEFGJKL': ['E','G','B','D','J','F','L','K'],
  'BDEFGIKL': ['E','G','B','D','I','F','L','K'],
  'BDEFGIJL': ['E','G','B','D','J','F','L','I'],
  'BDEFGIJK': ['E','G','B','D','J','F','I','K'],
  'BDEFGHKL': ['E','G','B','D','H','F','L','K'],
  'BDEFGHJL': ['H','G','B','D','J','F','L','E'],
  'BDEFGHJK': ['H','G','B','D','J','F','E','K'],
  'BDEFGHIL': ['E','G','B','D','H','F','L','I'],
  'BDEFGHIK': ['E','G','B','D','H','F','I','K'],
  'BDEFGHIJ': ['H','G','B','D','J','F','E','I'],
  'BCGHIJKL': ['H','J','B','C','I','G','L','K'],
  'BCFHIJKL': ['H','J','B','C','I','F','L','K'],
  'BCFGIJKL': ['I','G','B','C','J','F','L','K'],
  'BCFGHJKL': ['H','G','B','C','J','F','L','K'],
  'BCFGHIKL': ['H','G','B','C','I','F','L','K'],
  'BCFGHIJL': ['H','G','B','C','J','F','L','I'],
  'BCFGHIJK': ['H','G','B','C','J','F','I','K'],
  'BCEHIJKL': ['E','J','B','C','I','H','L','K'],
  'BCEGIJKL': ['E','J','B','C','I','G','L','K'],
  'BCEGHJKL': ['E','J','B','C','H','G','L','K'],
  'BCEGHIKL': ['E','G','B','C','I','H','L','K'],
  'BCEGHIJL': ['E','J','B','C','H','G','L','I'],
  'BCEGHIJK': ['E','J','B','C','H','G','I','K'],
  'BCEFIJKL': ['E','J','B','C','I','F','L','K'],
  'BCEFHJKL': ['E','J','B','C','H','F','L','K'],
  'BCEFHIKL': ['E','I','B','C','H','F','L','K'],
  'BCEFHIJL': ['E','J','B','C','H','F','L','I'],
  'BCEFHIJK': ['E','J','B','C','H','F','I','K'],
  'BCEFGJKL': ['E','G','B','C','J','F','L','K'],
  'BCEFGIKL': ['E','G','B','C','I','F','L','K'],
  'BCEFGIJL': ['E','G','B','C','J','F','L','I'],
  'BCEFGIJK': ['E','G','B','C','J','F','I','K'],
  'BCEFGHKL': ['E','G','B','C','H','F','L','K'],
  'BCEFGHJL': ['H','G','B','C','J','F','L','E'],
  'BCEFGHJK': ['H','G','B','C','J','F','E','K'],
  'BCEFGHIL': ['E','G','B','C','H','F','L','I'],
  'BCEFGHIK': ['E','G','B','C','H','F','I','K'],
  'BCEFGHIJ': ['H','G','B','C','J','F','E','I'],
  'BCDHIJKL': ['H','J','B','C','I','D','L','K'],
  'BCDGIJKL': ['I','G','B','C','J','D','L','K'],
  'BCDGHJKL': ['H','G','B','C','J','D','L','K'],
  'BCDGHIKL': ['H','G','B','C','I','D','L','K'],
  'BCDGHIJL': ['H','G','B','C','J','D','L','I'],
  'BCDGHIJK': ['H','G','B','C','J','D','I','K'],
  'BCDFIJKL': ['C','J','B','D','I','F','L','K'],
  'BCDFHJKL': ['C','J','B','D','H','F','L','K'],
  'BCDFHIKL': ['C','I','B','D','H','F','L','K'],
  'BCDFHIJL': ['C','J','B','D','H','F','L','I'],
  'BCDFHIJK': ['C','J','B','D','H','F','I','K'],
  'BCDFGJKL': ['C','G','B','D','J','F','L','K'],
  'BCDFGIKL': ['C','G','B','D','I','F','L','K'],
  'BCDFGIJL': ['C','G','B','D','J','F','L','I'],
  'BCDFGIJK': ['C','G','B','D','J','F','I','K'],
  'BCDFGHKL': ['C','G','B','D','H','F','L','K'],
  'BCDFGHJL': ['C','G','B','D','H','F','L','J'],
  'BCDFGHJK': ['H','G','B','C','J','F','D','K'],
  'BCDFGHIL': ['C','G','B','D','H','F','L','I'],
  'BCDFGHIK': ['C','G','B','D','H','F','I','K'],
  'BCDFGHIJ': ['H','G','B','C','J','F','D','I'],
  'BCDEIJKL': ['E','J','B','C','I','D','L','K'],
  'BCDEHJKL': ['E','J','B','C','H','D','L','K'],
  'BCDEHIKL': ['E','I','B','C','H','D','L','K'],
  'BCDEHIJL': ['E','J','B','C','H','D','L','I'],
  'BCDEHIJK': ['E','J','B','C','H','D','I','K'],
  'BCDEGJKL': ['E','G','B','C','J','D','L','K'],
  'BCDEGIKL': ['E','G','B','C','I','D','L','K'],
  'BCDEGIJL': ['E','G','B','C','J','D','L','I'],
  'BCDEGIJK': ['E','G','B','C','J','D','I','K'],
  'BCDEGHKL': ['E','G','B','C','H','D','L','K'],
  'BCDEGHJ':  ['E','G','B','C','J','D','L','H'],
  'BCDEGHJL': ['E','G','B','C','J','D','L','H'],
  'BCDEGHJK': ['E','G','B','C','J','D','H','K'],
  'BCDEGHIL': ['E','G','B','C','H','D','L','I'],
  'BCDEGHIK': ['E','G','B','C','H','D','I','K'],
  'BCDEGHIJ': ['H','G','B','C','J','D','E','I'],
  'BCDEFIJKL':['C','J','B','D','I','F','L','K'],
  'BCDEFHJKL':['C','J','B','D','H','F','L','K'],
  'BCDEFHIKL':['C','I','B','D','H','F','L','K'],
  'BCDEFHIJL':['C','J','B','D','H','F','L','I'],
  'BCDEFHIJK':['C','J','B','D','H','F','I','K'],
  'BCDEFGJKL':['C','G','B','D','J','F','L','K'],
  'BCDEFGIKL':['C','G','B','D','I','F','L','K'],
  'BCDEFGIJL':['C','G','B','D','J','F','L','I'],
  'BCDEFGIJK':['C','G','B','D','J','F','I','K'],
  'BCDEFGHKL':['C','G','B','D','H','F','L','K'],
  'BCDEFGHJL':['C','G','J','D','H','F','L','B'],
  'BCDEFGHJK':['C','G','J','D','H','F','B','K'],
  'BCDEFGHIL':['C','G','B','D','H','F','L','I'],
  'BCDEFGHIK':['C','G','B','D','H','F','I','K'],
  'BCDEFGHIJ':['H','G','B','C','J','F','D','I'],
  'ABGHIJKL': ['H','J','B','A','I','G','L','K'],
  'ABFHIJKL': ['H','J','B','A','I','F','L','K'],
  'ABFGIJKL': ['I','G','B','A','J','F','L','K'],
  'ABFGHJKL': ['H','G','B','A','J','F','L','K'],
  'ABFGHIKL': ['H','G','B','A','I','F','L','K'],
  'ABFGHIJL': ['H','G','B','A','J','F','L','I'],
  'ABFGHIJK': ['H','G','B','A','J','F','I','K'],
  'ABEHIJKL': ['E','J','B','A','I','H','L','K'],
  'ABEGIJKL': ['E','J','B','A','I','G','L','K'],
  'ABEGHJKL': ['E','J','B','A','H','G','L','K'],
  'ABEGHIKL': ['E','G','B','A','I','H','L','K'],
  'ABEGHIJL': ['E','J','B','A','H','G','L','I'],
  'ABEGHIJK': ['E','J','B','A','H','G','I','K'],
  'ABEFIJKL': ['E','J','B','A','I','F','L','K'],
  'ABEFHJKL': ['E','J','B','A','H','F','L','K'],
  'ABEFHIKL': ['E','I','B','A','H','F','L','K'],
  'ABEFHIJL': ['E','J','B','A','H','F','L','I'],
  'ABEFHIJK': ['E','J','B','A','H','F','I','K'],
  'ABEFGJKL': ['E','G','B','A','J','F','L','K'],
  'ABEFGIKL': ['E','G','B','A','I','F','L','K'],
  'ABEFGIJL': ['E','G','B','A','J','F','L','I'],
  'ABEFGIJK': ['E','G','B','A','J','F','I','K'],
  'ABEFGHKL': ['E','G','B','A','H','F','L','K'],
  'ABEFGHJL': ['H','G','B','A','J','F','L','E'],
  'ABEFGHJK': ['H','G','B','A','J','F','E','K'],
  'ABEFGHIL': ['E','G','B','A','H','F','L','I'],
  'ABEFGHIK': ['E','G','B','A','H','F','I','K'],
  'ABEFGHIJ': ['H','G','B','A','J','F','E','I'],
  'ABDHIJKL': ['H','J','B','A','I','D','L','K'],
  'ABDGIJKL': ['I','G','B','A','J','D','L','K'],
  'ABDGHJKL': ['H','G','B','A','J','D','L','K'],
  'ABDGHIKL': ['H','G','B','A','I','D','L','K'],
  'ABDGHIJL': ['H','G','B','A','J','D','L','I'],
  'ABDGHIJK': ['H','G','B','A','J','D','I','K'],
  'ABDFIJKL': ['A','J','B','D','I','F','L','K'],
  'ABDFHJKL': ['A','J','B','D','H','F','L','K'],
  'ABDFHIKL': ['A','I','B','D','H','F','L','K'],
  'ABDFHIJL': ['A','J','B','D','H','F','L','I'],
  'ABDFHIJK': ['A','J','B','D','H','F','I','K'],
  'ABDFGJKL': ['A','G','B','D','J','F','L','K'],
  'ABDFGIKL': ['A','G','B','D','I','F','L','K'],
  'ABDFGIJL': ['A','G','B','D','J','F','L','I'],
  'ABDFGIJK': ['A','G','B','D','J','F','I','K'],
  'ABDFGHKL': ['A','G','B','D','H','F','L','K'],
  'ABDFGHJL': ['H','G','B','A','J','F','L','D'],
  'ABDFGHJK': ['H','G','B','A','J','F','D','K'],
  'ABDFGHIL': ['A','G','B','D','H','F','L','I'],
  'ABDFGHIK': ['A','G','B','D','H','F','I','K'],
  'ABDFGHIJ': ['H','G','B','A','J','F','D','I'],
  'ABDEHIJKL':['E','J','B','A','I','D','L','K'],
  'ABDEHJKL': ['E','J','B','A','H','D','L','K'],
  'ABDEHIKL': ['E','I','B','A','H','D','L','K'],
  'ABDEHIJL': ['E','J','B','A','H','D','L','I'],
  'ABDEHIJK': ['E','J','B','A','H','D','I','K'],
  'ABDEGJKL': ['E','G','B','A','J','D','L','K'],
  'ABDEGIKL': ['E','G','B','A','I','D','L','K'],
  'ABDEGIJL': ['E','G','B','A','J','D','L','I'],
  'ABDEGIJK': ['E','G','B','A','J','D','I','K'],
  'ABDEGHKL': ['E','G','B','A','H','D','L','K'],
  'ABDEGHJ':  ['E','G','B','A','J','D','L','H'],
  'ABDEGHJL': ['E','G','B','A','J','D','L','H'],
  'ABDEGHJK': ['E','G','B','A','J','D','H','K'],
  'ABDEGHIL': ['E','G','B','A','H','D','L','I'],
  'ABDEGHIK': ['E','G','B','A','H','D','I','K'],
  'ABDEGHIJ': ['H','G','B','A','J','D','E','I'],
  'ABDEFIJKL':['A','J','B','D','I','F','L','K'],
  'ABDEFHJKL':['A','J','B','D','H','F','L','K'],
  'ABDEFHIKL':['A','I','B','D','H','F','L','K'],
  'ABDEFHIJL':['A','J','B','D','H','F','L','I'],
  'ABDEFHIJK':['A','J','B','D','H','F','I','K'],
  'ABDEFGJKL':['A','G','B','D','J','F','L','K'],
  'ABDEFGIKL':['A','G','B','D','I','F','L','K'],
  'ABDEFGIJL':['A','G','B','D','J','F','L','I'],
  'ABDEFGIJK':['A','G','B','D','J','F','I','K'],
  'ABDEFGHKL':['A','G','B','D','H','F','L','K'],
  'ABDEFGHJL':['H','G','B','A','J','F','L','D'],
  'ABDEFGHJK':['H','G','B','A','J','F','D','K'],
  'ABDEFGHIL':['A','G','B','D','H','F','L','I'],
  'ABDEFGHIK':['A','G','B','D','H','F','I','K'],
  'ABDEFGHIJ':['H','G','B','A','J','F','D','I'],
  'ABCGHIJKL':['H','J','B','C','A','G','L','K'],
  'ABCFHIJKL':['H','J','B','C','A','F','L','K'],
  'ABCFGIJKL':['I','G','B','C','A','F','L','K'],
  'ABCFGHJKL':['H','G','B','C','A','F','L','K'],
  'ABCFGHIKL':['H','G','B','C','A','F','L','K'],
  'ABCFGHIJL':['H','G','B','C','A','F','L','I'],
  'ABCFGHIJK':['H','G','B','C','A','F','I','K'],
  'ABCEHIJKL':['E','J','B','C','A','H','L','K'],
  'ABCEGIJKL':['E','J','B','C','A','G','L','K'],
  'ABCEGHJKL':['E','J','B','C','A','G','L','K'],
  'ABCEGHIKL':['E','G','B','C','A','H','L','K'],
  'ABCEGHIJL':['E','J','B','C','A','G','L','I'],
  'ABCEGHIJK':['E','J','B','C','A','G','I','K'],
  'ABCEFIJKL':['E','J','B','C','A','F','L','K'],
  'ABCEFHJKL':['E','J','B','C','A','F','L','K'],
  'ABCEFHIKL':['E','I','B','C','A','F','L','K'],
  'ABCEFHIJL':['E','J','B','C','A','F','L','I'],
  'ABCEFHIJK':['E','J','B','C','A','F','I','K'],
  'ABCEFGJKL':['E','G','B','C','A','F','L','K'],
  'ABCEFGIKL':['E','G','B','C','A','F','L','K'],
  'ABCEFGIJL':['E','G','B','C','A','F','L','I'],
  'ABCEFGIJK':['E','G','B','C','A','F','I','K'],
  'ABCEFGHKL':['E','G','B','C','A','F','L','K'],
  'ABCEFGHJL':['H','G','B','C','A','F','L','E'],
  'ABCEFGHJK':['H','G','B','C','A','F','E','K'],
  'ABCEFGHIL':['E','G','B','C','A','F','L','I'],
  'ABCEFGHIK':['E','G','B','C','A','F','I','K'],
  'ABCEFGHIJ':['H','G','B','C','A','F','E','I'],
  'ABCDHIJKL':['H','J','B','C','A','D','L','K'],
  'ABCDGIJKL':['I','G','B','C','A','D','L','K'],
  'ABCDGHJKL':['H','G','B','C','A','D','L','K'],
  'ABCDGHIKL':['H','G','B','C','A','D','L','K'],
  'ABCDGHIJL':['H','G','B','C','A','D','L','I'],
  'ABCDGHIJK':['H','J','B','C','A','D','I','K'],
  'ABCDFJKL': ['C','J','B','D','A','F','L','K'],
  'ABCDFIKL': ['C','I','B','D','A','F','L','K'],
  'ABCDFIJL': ['C','J','B','D','A','F','L','I'],
  'ABCDFIJK': ['C','J','B','D','A','F','I','K'],
  'ABCDFHKL': ['H','F','B','C','A','D','L','K'],
  'ABCDFHJL': ['C','J','B','D','A','F','L','H'],
  'ABCDFHJK': ['H','J','B','C','A','F','D','K'],
  'ABCDFHIL': ['H','F','B','C','A','D','L','I'],
  'ABCDFHIK': ['H','F','B','C','A','D','I','K'],
  'ABCDFHIJ': ['H','J','B','C','A','F','D','I'],
  'ABCDFGKL': ['C','G','B','D','A','F','L','K'],
  'ABCDFGJL': ['C','G','B','D','A','F','L','J'],
  'ABCDFGJK': ['C','G','B','D','A','F','J','K'],
  'ABCDFGIL': ['C','G','B','D','A','F','L','I'],
  'ABCDFGIK': ['C','G','B','D','A','F','I','K'],
  'ABCDFGIJ': ['C','G','B','D','A','F','I','J'],
  'ABCDFGHL': ['C','G','B','D','A','F','L','H'],
  'ABCDFGHK': ['H','G','B','C','A','F','D','K'],
  'ABCDFGHJ': ['H','G','B','C','A','F','D','J'],
  'ABCDFGHI': ['H','G','B','C','A','F','D','I'],
  'ABCDEJKL': ['E','J','B','C','A','D','L','K'],
  'ABCDEIKL': ['E','I','B','C','A','D','L','K'],
  'ABCDEIJL': ['E','J','B','C','A','D','L','I'],
  'ABCDEIJK': ['E','J','B','C','A','D','I','K'],
  'ABCDEHKL': ['H','E','B','C','A','D','L','K'],
  'ABCDEHJL': ['H','J','B','C','A','D','L','E'],
  'ABCDEHJK': ['H','J','B','C','A','D','E','K'],
  'ABCDEHIL': ['H','E','B','C','A','D','L','I'],
  'ABCDEHIK': ['H','E','B','C','A','D','I','K'],
  'ABCDEHIJ': ['H','J','B','C','A','D','E','I'],
  'ABCDEGKL': ['E','G','B','C','A','D','L','K'],
  'ABCDEGJL': ['E','G','B','C','A','D','L','J'],
  'ABCDEGJK': ['E','G','B','C','A','D','J','K'],
  'ABCDEGIL': ['E','G','B','C','A','D','L','I'],
  'ABCDEGIK': ['E','G','B','C','A','D','I','K'],
  'ABCDEGIJ': ['E','G','B','C','A','D','I','J'],
  'ABCDEGHL': ['H','G','B','C','A','D','L','E'],
  'ABCDEGHK': ['H','G','B','C','A','D','E','K'],
  'ABCDEGHJ': ['H','G','B','C','A','D','E','J'],
  'ABCDEGHI': ['H','G','B','C','A','D','E','I'],
  'ABCDEFKL': ['C','E','B','D','A','F','L','K'],
  'ABCDEFJL': ['C','J','B','D','A','F','L','E'],
  'ABCDEFJK': ['C','J','B','D','A','F','E','K'],
  'ABCDEFIL': ['C','E','B','D','A','F','L','I'],
  'ABCDEFIK': ['C','E','B','D','A','F','I','K'],
  'ABCDEFIJ': ['C','J','B','D','A','F','E','I'],
  'ABCDEFHL': ['H','F','B','C','A','D','L','E'],
  'ABCDEFHK': ['H','E','B','C','A','F','D','K'],
  'ABCDEFHJ': ['H','J','B','C','A','F','D','E'],
  'ABCDEFHI': ['H','E','B','C','A','F','D','I'],
  'ABCDEFGL': ['C','G','B','D','A','F','L','E'],
  'ABCDEFGK': ['C','G','B','D','A','F','E','K'],
  'ABCDEFGJ': ['C','G','B','D','A','F','E','J'],
  'ABCDEFGI': ['C','G','B','D','A','F','E','I'],
  'ABCDEFGH': ['H','G','B','C','A','F','D','E'],
  'ABCHIJKL': ['I','J','B','C','A','H','L','K'],
  'ABCGIJKL': ['I','J','B','C','A','G','L','K'],
  'ABCGHJKL': ['H','J','B','C','A','G','L','K'],
  'ABCGHIKL': ['I','G','B','C','A','H','L','K'],
  'ABCGHIJL': ['H','J','B','C','A','G','L','I'],
  'ABCGHIJK': ['H','J','B','C','A','G','I','K'],
  'ABCFIJKL': ['I','J','B','C','A','F','L','K'],
  'ABCFHJKL': ['H','J','B','C','A','F','L','K'],
  'ABCFHIKL': ['H','I','B','C','A','F','L','K'],
  'ABCFHIJL': ['H','J','B','C','A','F','L','I'],
  'ABCFHIJK': ['H','J','B','C','A','F','I','K'],
  'ABCFGJKL': ['C','J','B','F','A','G','L','K'],
  'ABCFGIKL': ['I','G','B','C','A','F','L','K'],
  'ABCFGIJL': ['C','J','B','F','A','G','L','I'],
  'ABCFGIJK': ['C','J','B','F','A','G','I','K'],
  'ABCFGHKL': ['H','G','B','C','A','F','L','K'],
  'ABCFGHJL': ['H','G','B','C','A','F','L','J'],
  'ABCFGHJK': ['H','G','B','C','A','F','J','K'],
  'ABCFGHIL': ['H','G','B','C','A','F','L','I'],
  'ABCFGHIK': ['H','G','B','C','A','F','I','K'],
  'ABCFGHIJ': ['H','G','B','C','A','F','I','J'],
  'ABCEIJKL': ['E','J','B','A','I','C','L','K'],
  'ABCEHJKL': ['E','J','B','C','A','H','L','K'],
  'ABCEHIKL': ['E','I','B','C','A','H','L','K'],
  'ABCEHIJL': ['E','J','B','C','A','H','L','I'],
  'ABCEHIJK': ['E','J','B','C','A','H','I','K'],
  'ABCEGJKL': ['E','J','B','C','A','G','L','K'],
  'ABCEGIKL': ['E','G','B','A','I','C','L','K'],
  'ABCEGIJL': ['E','J','B','C','A','G','L','I'],
  'ABCEGIJK': ['E','J','B','C','A','G','I','K'],
  'ABCEGHKL': ['E','G','B','C','A','H','L','K'],
  'ABCEGHJL': ['H','J','B','C','A','G','L','E'],
  'ABCEGHJK': ['H','J','B','C','A','G','E','K'],
  'ABCEGHIL': ['E','G','B','C','A','H','L','I'],
  'ABCEGHIK': ['E','G','B','C','A','H','I','K'],
  'ABCEGHIJ': ['H','J','B','C','A','G','E','I'],
  'ABCEFJKL': ['E','J','B','C','A','F','L','K'],
  'ABCEFIKL': ['E','I','B','C','A','F','L','K'],
  'ABCEFIJL': ['E','J','B','C','A','F','L','I'],
  'ABCEFIJK': ['E','J','B','C','A','F','I','K'],
  'ABCEFHKL': ['H','E','B','C','A','F','L','K'],
  'ABCEFHJL': ['H','J','B','C','A','F','L','E'],
  'ABCEFHJK': ['H','J','B','C','A','F','E','K'],
  'ABCEFHIL': ['H','E','B','C','A','F','L','I'],
  'ABCEFHIK': ['H','E','B','C','A','F','I','K'],
  'ABCEFHIJ': ['H','J','B','C','A','F','E','I'],
  'ABCEFGKL': ['E','G','B','C','A','F','L','K'],
  'ABCEFGJL': ['E','G','B','C','A','F','L','J'],
  'ABCEFGJK': ['E','G','B','C','A','F','J','K'],
  'ABCEFGIL': ['E','G','B','C','A','F','L','I'],
  'ABCEFGIK': ['E','G','B','C','A','F','I','K'],
  'ABCEFGIJ': ['E','G','B','C','A','F','I','J'],
  'ABCEFGHL': ['H','G','B','C','A','F','L','E'],
  'ABCEFGHK': ['H','G','B','C','A','F','E','K'],
  'ABCEFGHJ': ['H','G','B','C','A','F','E','J'],
  'ABCEFGHI': ['H','G','B','C','A','F','E','I'],
  'ABCDIJKL': ['I','J','B','C','A','D','L','K'],
  'ABCDHJKL': ['H','J','B','C','A','D','L','K'],
  'ABCDHIKL': ['H','I','B','C','A','D','L','K'],
  'ABCDHIJL': ['H','J','B','C','A','D','L','I'],
  'ABCDHIJK': ['H','J','B','C','A','D','I','K'],
  'ABCDGJKL': ['C','J','B','D','A','G','L','K'],
  'ABCDGIKL': ['I','G','B','C','A','D','L','K'],
  'ABCDGIJL': ['C','J','B','D','A','G','L','I'],
  'ABCDGIJK': ['C','J','B','D','A','G','I','K'],
  'ABCDGHKL': ['H','G','B','C','A','D','L','K'],
  'ABCDGHJL': ['H','G','B','C','A','D','L','J'],
  'ABCDGHJK': ['H','G','B','C','A','D','J','K'],
  'ABCDGHIL': ['H','G','B','C','A','D','L','I'],
  'ABCDGHIK': ['H','G','B','C','A','D','I','K'],
  'ABCDGHIJ': ['H','G','B','C','A','D','I','J'],
}

// ─── group table calculation ──────────────────────────────────────────────────

function calcGroupTables(results, fixtures) {
  const tables = {}
  for (const g of GROUPS) {
    tables[g] = GROUP_TEAMS[g].map(t => ({
      team: t, played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, gd: 0, pts: 0, group: g,
    }))
  }
  for (const f of fixtures.filter(f => f.round === 'group')) {
    const r = results[f.id]
    if (!r || r.home == null || r.away == null) continue
    const g = f.match_group
    const t1 = tables[g]?.find(x => x.team === f.home_team)
    const t2 = tables[g]?.find(x => x.team === f.away_team)
    if (!t1 || !t2) continue
    t1.played++; t2.played++
    t1.gf += r.home; t1.ga += r.away; t1.gd = t1.gf - t1.ga
    t2.gf += r.away; t2.ga += r.home; t2.gd = t2.gf - t2.ga
    if (r.home > r.away)      { t1.won++; t1.pts += 3; t2.lost++ }
    else if (r.away > r.home) { t2.won++; t2.pts += 3; t1.lost++ }
    else                      { t1.drawn++; t1.pts++; t2.drawn++; t2.pts++ }
  }
  for (const g of GROUPS) {
    tables[g].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  }
  return tables
}

function calcAllThirds(tables) {
  return GROUPS
    .map(g => ({ ...tables[g][2], group: g }))
    .filter(t => t.team)
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
}

// Check if top-8 thirds are unambiguous (no tie at 8/9 boundary)
function thirdsAreUnambiguous(allThirds) {
  if (allThirds.length < 9) return true // fewer than 9 groups complete, no boundary yet
  const t8 = allThirds[7]
  const t9 = allThirds[8]
  return !(t8.pts === t9.pts && t8.gd === t9.gd && t8.gf === t9.gf)
}

// ─── KO auto-population helpers ───────────────────────────────────────────────

// Parse slot codes like "1A" → { pos: 1, group: 'A' }, "2B" → { pos: 2, group: 'B' }
function parseGroupSlot(slotCode) {
  if (!slotCode) return null
  const m = slotCode.match(/^([12])([A-L])$/)
  if (!m) return null
  return { pos: parseInt(m[1]), group: m[2] }
}

// Get winner of a completed KO fixture
function getKoWinner(fixture, results) {
  const r = results[fixture.id]
  if (!r || r.home == null || r.away == null || r.home === r.away) return null
  return r.home > r.away ? fixture.home_team : fixture.away_team
}

// Get loser of a completed KO fixture  
function getKoLoser(fixture, results) {
  const r = results[fixture.id]
  if (!r || r.home == null || r.away == null || r.home === r.away) return null
  return r.home < r.away ? fixture.home_team : fixture.away_team
}

// ─── small components ─────────────────────────────────────────────────────────

function FlagImg({ team, className = 'w-5 h-3' }) {
  const src = flag(team)
  if (!src) return null
  return <img src={src} alt={team} className={`${className} object-cover rounded-sm flex-shrink-0 inline-block`} />
}

function ScoreInput({ value, onChange }) {
  return (
    <input
      type="number" min="0" max="99"
      value={value ?? ''} placeholder="–"
      className="w-10 text-center py-1 rounded-md text-sm font-bold outline-none bg-gray-700 border border-yellow-500/50 text-white focus:border-yellow-500 transition-colors"
      onChange={e => onChange(e.target.value === '' ? null : parseInt(e.target.value))}
    />
  )
}

// ─── Group table panel ────────────────────────────────────────────────────────

function GroupTablePanel({ tables, allThirds, activeGroup }) {
  const [selectedGroup, setSelectedGroup] = useState(activeGroup || 'A')

  return (
    <div className="p-4 overflow-y-auto">
      <h3 className="font-bold text-yellow-400 mb-3 text-sm uppercase tracking-wider">Live Tables</h3>
      <div className="flex flex-wrap gap-1 mb-4">
        {GROUPS.map(g => (
          <button key={g} onClick={() => setSelectedGroup(g)}
            className={`text-xs px-2 py-1 rounded font-bold transition-colors
              ${selectedGroup === g ? 'bg-yellow-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {g}
          </button>
        ))}
      </div>

      {/* Selected group table */}
      <div className="bg-gray-950 rounded-xl overflow-hidden mb-4">
        <div className="bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-400 uppercase tracking-wider">
          Group {selectedGroup}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-3 py-1.5 text-gray-500">#</th>
              <th className="text-left px-3 py-1.5 text-gray-500">Team</th>
              <th className="px-2 py-1.5 text-gray-500">P</th>
              <th className="px-2 py-1.5 text-gray-500">GD</th>
              <th className="px-2 py-1.5 text-gray-500">Pts</th>
            </tr>
          </thead>
          <tbody>
            {(tables[selectedGroup] || []).map((row, i) => (
              <tr key={row.team} className={`border-b border-gray-800/50
                ${i < 2 ? 'bg-green-500/5' : i === 2 ? 'bg-amber-500/5' : ''}`}>
                <td className="px-3 py-1.5 text-gray-500">{i + 1}</td>
                <td className="px-3 py-1.5 font-medium text-white">
                  <span className="flex items-center gap-1">
                    <FlagImg team={row.team} className="w-4 h-3" />
                    <span className="truncate max-w-20">{row.team}</span>
                    {i < 2 && <span className="text-green-400 text-xs">✓</span>}
                    {i === 2 && <span className="text-amber-400 text-xs">3rd</span>}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-center text-gray-400">{row.played}</td>
                <td className={`px-2 py-1.5 text-center ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {row.gd > 0 ? '+' : ''}{row.gd}
                </td>
                <td className="px-2 py-1.5 text-center font-bold text-yellow-400">{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Best 3rd place */}
      <div className="bg-gray-950 rounded-xl overflow-hidden">
        <div className="bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          Best 3rd Place (Top 8 Advance)
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-3 py-1.5 text-gray-500">#</th>
              <th className="text-left px-3 py-1.5 text-gray-500">Team</th>
              <th className="px-2 py-1.5 text-gray-500">Grp</th>
              <th className="px-2 py-1.5 text-gray-500">GD</th>
              <th className="px-2 py-1.5 text-gray-500">Pts</th>
            </tr>
          </thead>
          <tbody>
            {allThirds.map((row, i) => (
              <tr key={row.group} className={`border-b border-gray-800/50 ${i < 8 ? 'bg-amber-500/5' : 'opacity-40'}`}>
                <td className="px-3 py-1.5 text-gray-500">{i + 1}{i < 8 ? ' ✓' : ''}</td>
                <td className="px-3 py-1.5 font-medium text-white">
                  <span className="flex items-center gap-1">
                    <FlagImg team={row.team} className="w-4 h-3" />
                    <span className="truncate max-w-16">{row.team}</span>
                  </span>
                </td>
                <td className="px-2 py-1.5 text-center text-yellow-400 font-bold">{row.group}</td>
                <td className={`px-2 py-1.5 text-center ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {row.gd > 0 ? '+' : ''}{row.gd}
                </td>
                <td className="px-2 py-1.5 text-center font-bold text-yellow-400">{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ResultsClient({ fixtures, masterExtras: initialMasterExtras }) {
  const [activeTab, setActiveTab] = useState('group')
  const [activeGroup, setActiveGroup] = useState('A')
  const [showMobileTables, setShowMobileTables] = useState(false)

  const [results, setResults] = useState(() => {
    const map = {}
    for (const f of fixtures) {
      if (f.home_score != null || f.away_score != null) {
        map[f.id] = { home: f.home_score, away: f.away_score }
      }
    }
    return map
  })

  // Local copy of fixtures so we can update home_team/away_team after auto-population
  const [fixtureData, setFixtureData] = useState(fixtures)

  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)
  const [autoPopLog, setAutoPopLog] = useState([]) // track what was auto-populated

  const [overrideGroups, setOverrideGroups] = useState(() => {
    const saved = initialMasterExtras?.third_place_override
    return saved ? new Set(saved) : null
  })
  const [draftOverride, setDraftOverride] = useState(() => {
    const saved = initialMasterExtras?.third_place_override
    return saved ? new Set(saved) : null
  })
  const [overrideOpen, setOverrideOpen] = useState(false)

  const supabaseRef = useRef(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── KO auto-population ────────────────────────────────────────────────────────

  const autoPopulateKO = useCallback(async (newResults, newFixtureData, currentOverride) => {
    const updates = [] // { id, home_team?, away_team? }

    const tables = calcGroupTables(newResults, newFixtureData)
    const groupFixtures = newFixtureData.filter(f => f.round === 'group')
    const koFixtures = newFixtureData.filter(f => f.round !== 'group')
    const fixturesByMatchNum = {}
    for (const f of newFixtureData) fixturesByMatchNum[f.match_number] = f

    // ── 1. Group winners/runners-up → R32 ──────────────────────────────────────
    for (const g of GROUPS) {
      const groupFs = groupFixtures.filter(f => f.match_group === g)
      const allDone = groupFs.every(f => {
        const r = newResults[f.id]
        return r?.home != null && r?.away != null
      })
      if (!allDone) continue

      const winner = tables[g][0]?.team
      const runnerUp = tables[g][1]?.team
      if (!winner || !runnerUp) continue

      // Find R32 fixtures with slot1 or slot2 matching "1G" or "2G"
      for (const kof of koFixtures.filter(f => f.round === 'R32')) {
        const s1 = parseGroupSlot(kof.slot1)
        const s2 = parseGroupSlot(kof.slot2)

        if (s1?.group === g) {
          const team = s1.pos === 1 ? winner : runnerUp
          if (kof.home_team !== team) {
            updates.push({ id: kof.id, home_team: team })
          }
        }
        if (s2?.group === g) {
          const team = s2.pos === 1 ? winner : runnerUp
          if (kof.away_team !== team) {
            updates.push({ id: kof.id, away_team: team })
          }
        }
      }
    }

    // ── 2. 3rd place → R32 (Annex C) ──────────────────────────────────────────
    const allGroupsDone = GROUPS.every(g => {
      const gf = groupFixtures.filter(f => f.match_group === g)
      return gf.length > 0 && gf.every(f => {
        const r = newResults[f.id]; return r?.home != null && r?.away != null
      })
    })

    if (allGroupsDone) {
      const allThirds = calcAllThirds(tables)
      const unambiguous = thirdsAreUnambiguous(allThirds)
      const effectiveTop8 = currentOverride
        ? [...currentOverride].sort()
        : unambiguous
          ? allThirds.slice(0, 8).map(t => t.group)
          : null

      if (effectiveTop8) {
        const key = effectiveTop8.sort().join('')
        const entry = ANNEX_C[key]
        if (entry) {
          for (const [matchNum, col] of Object.entries(ANNEX_C_MATCH_TO_COL)) {
            const groupLetter = entry[col]
            const team = tables[groupLetter]?.[2]?.team
            const fixture = fixturesByMatchNum[Number(matchNum)]
            if (fixture && team && fixture.away_team !== team) {
              updates.push({ id: fixture.id, away_team: team })
            }
          }
        }
      } else if (!currentOverride) {
        // Ambiguous and no override — set TBD for 3rd place slots
        for (const matchNum of Object.keys(ANNEX_C_MATCH_TO_COL)) {
          const fixture = fixturesByMatchNum[Number(matchNum)]
          if (fixture && fixture.away_team && fixture.away_team !== 'TBD') {
            updates.push({ id: fixture.id, away_team: 'TBD' })
          }
        }
      }
    }

    // ── 3. KO winners propagate to next round ─────────────────────────────────
    const koRounds = ['R32', 'R16', 'QF', 'SF']
    for (const round of koRounds) {
      const roundFs = koFixtures.filter(f => f.round === round)
      for (const f of roundFs) {
        const winner = getKoWinner(f, newResults)
        const loser = getKoWinner(f, newResults) ? getKoLoser(f, newResults) : null
        if (!winner) continue

        // Find fixtures in the next round that reference this match via slot codes
        const winnerSlot = `W${f.match_number}`
        const loserSlot = `L${f.match_number}`

        for (const nextF of koFixtures) {
          if (nextF.slot1 === winnerSlot && nextF.home_team !== winner) {
            updates.push({ id: nextF.id, home_team: winner })
          }
          if (nextF.slot2 === winnerSlot && nextF.away_team !== winner) {
            updates.push({ id: nextF.id, away_team: winner })
          }
          if (nextF.slot1 === loserSlot && loser && nextF.home_team !== loser) {
            updates.push({ id: nextF.id, home_team: loser })
          }
          if (nextF.slot2 === loserSlot && loser && nextF.away_team !== loser) {
            updates.push({ id: nextF.id, away_team: loser })
          }
        }
      }
    }

    if (updates.length === 0) return

    // Merge updates per fixture (multiple slot updates on same fixture)
    const merged = {}
    for (const u of updates) {
      merged[u.id] = { ...merged[u.id], ...u }
    }

    // Write to DB and update local fixture state
    const newFixtures = [...newFixtureData]
    const logEntries = []

    for (const { id, ...fields } of Object.values(merged)) {
      const { error } = await supabase
        .from('fixtures')
        .update(fields)
        .eq('id', id)

      if (!error) {
        const idx = newFixtures.findIndex(f => f.id === id)
        if (idx !== -1) {
          newFixtures[idx] = { ...newFixtures[idx], ...fields }
          if (fields.home_team) logEntries.push(fields.home_team)
          if (fields.away_team) logEntries.push(fields.away_team)
        }
      }
    }

    if (logEntries.length > 0) {
      setFixtureData(newFixtures)
      setAutoPopLog(logEntries)
      setTimeout(() => setAutoPopLog([]), 4000)
    }
  }, [supabase])

  // ── result entry ──────────────────────────────────────────────────────────────

  const saveResult = async (fixtureId, home, away) => {
    setSaving(true)
    const { error } = await supabase
      .from('fixtures')
      .update({
        home_score: home, away_score: away,
        status: home != null && away != null ? 'complete' : 'scheduled',
      })
      .eq('id', fixtureId)
    setSaving(false)
    if (error) { showToast('Save failed — ' + error.message, 'error'); return }
    showToast('✓ Saved')
  }

  const clearResult = async (fixtureId) => {
    setSaving(true)
    const { error } = await supabase
      .from('fixtures')
      .update({ home_score: null, away_score: null, status: 'scheduled' })
      .eq('id', fixtureId)
    if (!error) {
      setResults(prev => { const next = { ...prev }; delete next[fixtureId]; return next })
      showToast('Result cleared')
    } else {
      showToast('Clear failed', 'error')
    }
    setSaving(false)
  }

  const updateResult = (fixtureId, side, value) => {
    setResults(prev => {
      const updated = { ...prev, [fixtureId]: { ...(prev[fixtureId] || {}), [side]: value } }
      const r = updated[fixtureId]
      if (r.home != null && r.away != null) {
        saveResult(fixtureId, r.home, r.away).then(() => {
          autoPopulateKO(updated, fixtureData, overrideGroups)
        })
      }
      return updated
    })
  }

  // ── 3rd place override ────────────────────────────────────────────────────────

  const toggleDraftGroup = (g) => {
    setDraftOverride(prev => {
      const next = prev ? new Set(prev) : new Set()
      if (next.has(g)) next.delete(g)
      else if (next.size < 8) next.add(g)
      return next
    })
  }

  const saveOverride = async () => {
    if (!draftOverride || draftOverride.size !== 8) {
      showToast('Select exactly 8 groups', 'error'); return
    }
    const value = [...draftOverride].sort()
    const { error } = await supabase
      .from('master_extras')
      .update({ third_place_override: value, updated_at: new Date().toISOString() })
      .not('id', 'is', null)
    if (!error) {
      const newOverride = new Set(value)
      setOverrideGroups(newOverride)
      showToast('Override saved ✓')
      // Re-run auto-population with the new override
      await autoPopulateKO(results, fixtureData, newOverride)
    } else {
      showToast('Save failed — ' + error.message, 'error')
    }
  }

  const clearOverride = async () => {
    const { error } = await supabase
      .from('master_extras')
      .update({ third_place_override: null, updated_at: new Date().toISOString() })
      .not('id', 'is', null)
    if (!error) {
      setOverrideGroups(null)
      setDraftOverride(null)
      showToast('Override cleared — using auto-computed ranking')
      await autoPopulateKO(results, fixtureData, null)
    } else {
      showToast('Clear failed — ' + error.message, 'error')
    }
  }

  // ── derived data ──────────────────────────────────────────────────────────────

  const groupFixtures = fixtureData.filter(f => f.round === 'group')
  const koFixtures    = fixtureData.filter(f => f.round !== 'group')
  const filteredGroupFixtures = activeGroup === 'ALL'
    ? groupFixtures
    : groupFixtures.filter(f => f.match_group === activeGroup)

  const resultsEntered = fixtureData.filter(f => {
    const r = results[f.id]; return r?.home != null && r?.away != null
  }).length

  const groupResultsDone = GROUPS.every(g =>
    groupFixtures.filter(f => f.match_group === g)
      .every(f => results[f.id]?.home != null && results[f.id]?.away != null)
  )

  const tables = calcGroupTables(results, fixtureData)
  const allThirds = calcAllThirds(tables)
  const autoTop8 = allThirds.slice(0, 8).map(t => t.group)
  const effectiveTop8 = overrideGroups ? [...overrideGroups].sort() : autoTop8
  const ambiguous = groupResultsDone && !thirdsAreUnambiguous(allThirds) && !overrideGroups

  // ── render helpers ────────────────────────────────────────────────────────────

  const renderTable = (fixtureList) => (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-yellow-500/5">
            <th className="px-3 py-2 text-left text-xs text-gray-500 w-8">#</th>
            <th className="px-2 py-2 text-right text-xs text-gray-500">Home</th>
            <th className="px-1 py-2 text-center text-xs text-gray-500 w-8">H</th>
            <th className="px-1 py-2 text-center text-xs text-gray-500 w-4">–</th>
            <th className="px-1 py-2 text-center text-xs text-gray-500 w-8">A</th>
            <th className="px-2 py-2 text-left text-xs text-gray-500">Away</th>
            <th className="px-2 py-2 text-right text-xs text-gray-500 hidden md:table-cell">Date</th>
            <th className="w-6"/>
          </tr>
        </thead>
        <tbody>
          {fixtureList.map(f => {
            const r = results[f.id] || {}
            const hasResult = r.home != null && r.away != null
            const t1 = f.home_team || f.slot1 || '?'
            const t2 = f.away_team || f.slot2 || '?'
            const t1Known = !!f.home_team && f.home_team !== 'TBD'
            const t2Known = !!f.away_team && f.away_team !== 'TBD'
            return (
              <tr key={f.id} className={`border-b border-gray-800/50 ${hasResult ? 'bg-green-500/5' : 'hover:bg-gray-800/30'}`}>
                <td className="px-3 py-2 text-gray-600 text-xs">{f.match_number}</td>
                <td className="px-2 py-2 text-right">
                  <span className="font-medium flex items-center justify-end gap-1.5">
                    <span className={`hidden sm:inline text-sm ${t1Known ? 'text-white' : 'text-gray-600 italic'}`}>{t1}</span>
                    {t1Known && flag(t1) && <img src={flag(t1)} alt={t1} className="w-5 h-3 object-cover rounded-sm"/>}
                  </span>
                </td>
                <td className="px-1 py-2 text-center">
                  <ScoreInput value={r.home} onChange={v => updateResult(f.id, 'home', v)}/>
                </td>
                <td className="px-1 py-2 text-center text-gray-600 font-bold">–</td>
                <td className="px-1 py-2 text-center">
                  <ScoreInput value={r.away} onChange={v => updateResult(f.id, 'away', v)}/>
                </td>
                <td className="px-2 py-2">
                  <span className="font-medium flex items-center gap-1.5">
                    {t2Known && flag(t2) && <img src={flag(t2)} alt={t2} className="w-5 h-3 object-cover rounded-sm"/>}
                    <span className={`hidden sm:inline text-sm ${t2Known ? 'text-white' : 'text-gray-600 italic'}`}>{t2}</span>
                  </span>
                </td>
                <td className="px-2 py-2 text-right text-xs text-gray-600 hidden md:table-cell whitespace-nowrap">
                  {f.kickoff_utc ? new Date(f.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                </td>
                <td className="px-2 py-2 text-center">
                  {hasResult && (
                    <button onClick={() => clearResult(f.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors">✕</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  // ── 3rd place override panel ──────────────────────────────────────────────────

  const renderOverridePanel = () => {
    const draft = draftOverride ?? new Set(autoTop8)
    return (
      <div className="space-y-6">
        {ambiguous && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm font-medium">⚠️ Tie at the 8th/9th boundary</p>
            <p className="text-gray-400 text-xs mt-1">
              Two 3rd-place teams are level on Pts, GD, and GF. Pts→GD→GF cannot resolve this.
              Use the manual override below to set the correct 8 qualifiers once FIFA has applied tiebreakers (fair play, FIFA ranking, or draw of lots).
            </p>
          </div>
        )}
        {overrideGroups ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-amber-400 text-sm font-medium">⚠️ Override active</p>
            <p className="text-gray-500 text-xs mt-1">Groups {[...overrideGroups].sort().join(', ')}</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm">🤖 Using auto-computed ranking (Pts → GD → GF)</p>
          </div>
        )}

        {/* Auto-computed table */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Auto-Computed 3rd Place Ranking</h3>
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-yellow-500/5">
                  <th className="px-3 py-2 text-left text-xs text-gray-500">#</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">Team</th>
                  <th className="px-2 py-2 text-center text-xs text-gray-500">Grp</th>
                  <th className="px-2 py-2 text-center text-xs text-gray-500">Pts</th>
                  <th className="px-2 py-2 text-center text-xs text-gray-500">GD</th>
                  <th className="px-2 py-2 text-center text-xs text-gray-500">GF</th>
                  <th className="px-2 py-2 text-center text-xs text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {allThirds.map((row, i) => (
                  <tr key={row.group} className={`border-b border-gray-800/50 ${i < 8 ? 'bg-green-500/5' : ''}`}>
                    <td className="px-3 py-2 text-gray-500 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-white">
                      <span className="flex items-center gap-1.5">
                        {flag(row.team) && <img src={flag(row.team)} alt={row.team} className="w-5 h-3 object-cover rounded-sm flex-shrink-0"/>}
                        <span className="hidden sm:inline">{row.team}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-yellow-400 text-xs">{row.group}</td>
                    <td className="px-2 py-2 text-center text-gray-300 text-xs font-bold">{row.pts}</td>
                    <td className={`px-2 py-2 text-center text-xs ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {row.gd > 0 ? '+' : ''}{row.gd}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-400 text-xs">{row.gf}</td>
                    <td className="px-2 py-2 text-center text-xs">
                      {i < 8 ? <span className="text-green-400 font-bold">✓ Qualifies</span> : <span className="text-gray-600">Eliminated</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!groupResultsDone && <p className="text-xs text-gray-600 mt-2 text-center">Complete all 72 group results to see the final ranking</p>}
        </div>

        {/* Manual override */}
        <div>
          <button onClick={() => setOverrideOpen(o => !o)}
            className="flex items-center gap-2 text-sm font-bold text-yellow-400 hover:text-yellow-300 transition-colors">
            <span>{overrideOpen ? '▼' : '▶'}</span>
            Manual Override
            {overrideGroups && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Active</span>}
          </button>

          {overrideOpen && (
            <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm mb-4">Select exactly 8 groups whose 3rd-place teams qualified.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {GROUPS.map(g => {
                  const isSelected = draft.has(g)
                  const team = tables[g]?.[2]?.team ?? `3rd in ${g}`
                  const isAutoTop8 = autoTop8.includes(g)
                  return (
                    <button key={g} onClick={() => toggleDraftGroup(g)} title={team}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border
                        ${isSelected ? 'bg-yellow-500 text-gray-950 border-yellow-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}>
                      <span className="block text-sm">{g}</span>
                      <span className={`block text-xs mt-0.5 font-normal truncate max-w-16 ${isSelected ? 'text-gray-800' : 'text-gray-500'}`}>
                        {team.split(' ').slice(-1)[0]}
                      </span>
                      {isAutoTop8 && !isSelected && <span className="block text-xs text-blue-400 mt-0.5">auto ✓</span>}
                    </button>
                  )
                })}
              </div>
              <p className={`text-sm font-medium mb-4 ${draft.size === 8 ? 'text-green-400' : 'text-amber-400'}`}>
                {draft.size}/8 selected{draft.size === 8 ? ' ✓' : draft.size < 8 ? ` — select ${8 - draft.size} more` : ' — too many'}
              </p>
              <div className="flex gap-3">
                <button onClick={saveOverride} disabled={draft.size !== 8}
                  className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold rounded-lg text-sm transition-colors">
                  Save Override
                </button>
                {overrideGroups && (
                  <button onClick={clearOverride}
                    className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg text-sm transition-colors border border-gray-700">
                    Clear Override
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Effective qualifiers */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Effective 3rd Place Qualifiers</p>
          <div className="flex flex-wrap gap-2">
            {effectiveTop8.map(g => {
              const team = tables[g]?.[2]?.team
              return (
                <div key={g} className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5">
                  {team && flag(team) && <img src={flag(team)} alt={team} className="w-5 h-3 object-cover rounded-sm"/>}
                  <span className="text-xs font-bold text-yellow-400">{g}</span>
                  {team && <span className="text-xs text-gray-400">{team}</span>}
                </div>
              )
            })}
          </div>
          {overrideGroups && <p className="text-xs text-amber-400 mt-2">⚠️ Manual override active</p>}
        </div>
      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">← Admin</Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{resultsEntered}/104 entered</span>
          {saving && <span className="text-xs text-yellow-400 animate-pulse">Saving…</span>}
          {autoPopLog.length > 0 && (
            <span className="text-xs text-blue-400 animate-pulse">⚡ Auto-populated {autoPopLog.length} slot{autoPopLog.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4 pb-24">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <p className="text-yellow-400 text-sm font-medium">
            ⚡ Results entered here update scores for <strong>all leagues</strong> instantly. KO team slots populate automatically as groups complete.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[['group','Group Stage'],['knockout','Knockout'],['override','3rd Place Slots']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors relative
                ${activeTab === id ? 'bg-yellow-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {label}
              {id === 'override' && (overrideGroups || ambiguous) && (
                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${ambiguous ? 'bg-red-400' : 'bg-amber-400'}`}/>
              )}
            </button>
          ))}
        </div>

        {/* Group stage */}
        {activeTab === 'group' && (
          <div className="flex gap-4">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-4">
                {GROUPS.map(g => {
                  const gf = groupFixtures.filter(f => f.match_group === g)
                  const done = gf.every(f => results[f.id]?.home != null && results[f.id]?.away != null)
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
              {renderTable(filteredGroupFixtures)}
            </div>

            {/* Desktop sidebar — live tables */}
            <div className="hidden lg:block w-72 flex-shrink-0 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <GroupTablePanel tables={tables} allThirds={allThirds} activeGroup={activeGroup === 'ALL' ? 'A' : activeGroup} />
            </div>
          </div>
        )}

        {/* Knockout */}
        {activeTab === 'knockout' && (
          <div className="space-y-6">
            {['R32','R16','QF','SF','3RD','FINAL'].map(round => {
              const roundFixtures = koFixtures.filter(f => f.round === round)
              if (!roundFixtures.length) return null
              return (
                <div key={round}>
                  <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-3">{ROUND_LABELS[round]}</h3>
                  {renderTable(roundFixtures)}
                </div>
              )
            })}
          </div>
        )}

        {/* 3rd place override */}
        {activeTab === 'override' && renderOverridePanel()}
      </div>

      {/* Mobile tables button — only on group tab */}
      {activeTab === 'group' && (
        <div className="lg:hidden fixed bottom-16 right-4 z-30">
          <button onClick={() => setShowMobileTables(p => !p)}
            className="bg-yellow-500 text-gray-950 font-bold rounded-full px-4 py-2 text-sm shadow-lg">
            📊 Tables
          </button>
        </div>
      )}

      {/* Mobile tables drawer */}
      {showMobileTables && (
        <div className="lg:hidden fixed inset-0 bg-gray-950 z-40 overflow-y-auto pb-20">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <span className="font-bold text-yellow-400">Live Group Tables</span>
            <button onClick={() => setShowMobileTables(false)} className="text-gray-400 text-xl">✕</button>
          </div>
          <GroupTablePanel tables={tables} allThirds={allThirds} activeGroup={activeGroup === 'ALL' ? 'A' : activeGroup} />
        </div>
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