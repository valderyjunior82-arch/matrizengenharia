// dados.js escolhe entre dadosMock.js e dadosBanco.js. Função que existe numa só
// vira undefined calado na outra (sem erro de build): este teste pega isso.
import * as mock from '../src/lib/dadosMock.js'
import * as real from '../src/lib/dadosBanco.js'
import * as dados from '../src/lib/dados.js'

const nomes = (m) => Object.keys(m).sort()
const soMock = nomes(mock).filter((n) => !(n in real))
const soBanco = nomes(real).filter((n) => !(n in mock))
const foraDaLista = nomes(mock).filter((n) => typeof dados[n] !== 'function')

const erros = [
  ...soMock.map((n) => `${n} existe só em dadosMock.js`),
  ...soBanco.map((n) => `${n} existe só em dadosBanco.js`),
  ...foraDaLista.map((n) => `${n} não está na lista de dados.js`),
]
erros.forEach((e) => console.log(`✗ ${e}`))
console.log(`${erros.length ? 'FALHOU' : 'ok'} — mock e banco com as mesmas ${nomes(mock).length} funções`)
process.exit(erros.length ? 1 : 0)
