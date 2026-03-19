// ESLint v9+ utilise le format "flat config" par défaut.
// eslint-config-next fournit la configuration adaptée à Next.js.
//
// Note: on désactive `react/no-unescaped-entities` pour éviter des erreurs
// purement textuelles (apostrophes non échappées) qui ne bloquent pas
// la qualité technique (CWV/SEO) ni l'exécution.
module.exports = [
  ...require("eslint-config-next"),
  {
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
]

