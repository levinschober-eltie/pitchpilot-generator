export const FOERDERPROGRAMME = [
  {
    id: "kfw270",
    name: "KfW 270 – Erneuerbare Energien",
    typ: "Kredit",
    foerderquote: null,
    zinsvorteil: "ab 4,03% eff. p.a.",
    bedingungen: "PV-Anlage oder Batteriespeicher",
    phasen: ["pv", "speicher"],
    icon: "bank",
  },
  {
    id: "kfw295m2",
    name: "KfW 295 Modul 2 – Prozesswärme",
    typ: "Zuschuss",
    foerderquote: 40,
    bedingungen: "Wärmepumpen, Prozesswärme aus EE",
    phasen: ["waerme"],
    icon: "fire",
  },
  {
    id: "beg_nwg",
    name: "BEG NWG – Heizungstausch",
    typ: "Zuschuss",
    foerderquote: 30,
    bonusQuote: 20,
    bedingungen: "30% Basis + 20% Tauschbonus für Gewerbe-WP",
    phasen: ["waerme"],
    icon: "fire",
  },
  {
    id: "bafa_em",
    name: "BAFA – Energieberatung Mittelstand",
    typ: "Zuschuss",
    foerderquote: 80,
    maxBetrag: 6000,
    bedingungen: "Energieberatung für KMU",
    phasen: ["analyse"],
    icon: "chart",
  },
  {
    id: "geig",
    name: "GEIG – Ladeinfrastruktur-Pflicht",
    typ: "Pflicht",
    bedingungen: "Nichtwohngebäude >6 Stellplätze",
    phasen: ["ladeinfra"],
    icon: "car",
  },
]

export function matchFoerdermittel(enabledPhaseKeys, investByPhase) {
  return FOERDERPROGRAMME.filter(p =>
    p.phasen.some(ph => enabledPhaseKeys.includes(ph))
  ).map(p => {
    let estimatedAmount = null
    if (p.foerderquote && investByPhase) {
      const relevantInvest = p.phasen.reduce((sum, ph) => sum + (investByPhase[ph] || 0), 0)
      estimatedAmount = Math.round(relevantInvest * p.foerderquote / 100)
      if (p.maxBetrag) estimatedAmount = Math.min(estimatedAmount, p.maxBetrag)
    }
    return { ...p, estimatedAmount }
  })
}
