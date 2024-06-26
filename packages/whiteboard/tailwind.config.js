module.exports = {
  purge: [
    './index.html',
    './src/**/*.tsx',
    './src/**/styles.ts',
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      keyframes: {
        'spinner-dots-loading': {
          '0%': { transform: 'translate3D(-48.621%, 0, -.985px) scale(.511)' },
          '2.778%': { transform: 'translate3D(-95.766%, 0, -.94px) scale(.545)' },
          '5.556%': { transform: 'translate3D(-140%, 0, -.866px) scale(.6)' },
          '8.333%': { transform: 'translate3D(-179.981%, 0, -.766px) scale(.675)' },
          '11.111%': { transform: 'translate3D(-214.492%, 0, -.643px) scale(.768)' },
          '13.889%': { transform: 'translate3D(-242.487%, 0, -.5px) scale(.875)' },
          '16.667%': { transform: 'translate3D(-263.114%, 0, -.342px) scale(.993)' },
          '19.444%': { transform: 'translate3D(-275.746%, 0, -.174px) scale(1.12)' },
          '22.222%': { transform: 'translate3D(-280%, 0, 0) scale(1.25)' },
          '25%': { transform: 'translate3D(-275.746%, 0, .174px) scale(1.38)' },
          '27.778%': { transform: 'translate3D(-263.114%, 0, .342px) scale(1.507)' },
          '30.556%': { transform: 'translate3D(-242.487%, 0, .5px) scale(1.625)' },
          '33.333%': { transform: 'translate3D(-214.492%, 0, .643px) scale(1.732)' },
          '36.111%': { transform: 'translate3D(-179.981%, 0, .766px) scale(1.825)' },
          '38.889%': { transform: 'translate3D(-140%, 0, .866px) scale(1.9)' },
          '41.667%': { transform: 'translate3D(-95.766%, 0, .94px) scale(1.955)' },
          '44.444%': { transform: 'translate3D(-48.621%, 0, .985px) scale(1.989)' },
          '47.222%': { transform: 'translateZ(1px) scale(2)' },
          '50%': { transform: 'translate3D(48.621%, 0, .985px) scale(1.989)' },
          '52.778%': { transform: 'translate3D(95.766%, 0, .94px) scale(1.955)' },
          '55.556%': { transform: 'translate3D(140%, 0, .866px) scale(1.9)' },
          '58.333%': { transform: 'translate3D(179.981%, 0, .766px) scale(1.825)' },
          '61.111%': { transform: 'translate3D(214.492%, 0, .643px) scale(1.732)' },
          '63.889%': { transform: 'translate3D(242.487%, 0, .5px) scale(1.625)' },
          '66.667%': { transform: 'translate3D(263.114%, 0, .342px) scale(1.507)' },
          '69.444%': { transform: 'translate3D(275.746%, 0, .174px) scale(1.38)' },
          '72.222%': { transform: 'translate3D(280%, 0, 0) scale(1.25)' },
          '75%': { transform: 'translate3D(275.746%, 0, -.174px) scale(1.12)' },
          '77.778%': { transform: 'translate3D(263.114%, 0, -.342px) scale(.993)' },
          '80.556%': { transform: 'translate3D(242.487%, 0, -.5px) scale(.875)' },
          '83.333%': { transform: 'translate3D(214.492%, 0, -.643px) scale(.768)' },
          '86.111%': { transform: 'translate3D(179.981%, 0, -.766px) scale(.675)' },
          '88.889%': { transform: 'translate3D(140%, 0, -.866px) scale(.6)' },
          '91.667%': { transform: 'translate3D(95.766%, 0, -.94px) scale(.545)' },
          '94.444%': { transform: 'translate3D(48.621%, 0, -.985px) scale(.511)' },
          '97.222%': { transform: 'translateZ(-1px) scale(.5)' },
        },
      },
      animation: {
        'spinner-dots-loading': 'spinner-dots-loading 2s linear infinite forwards',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
