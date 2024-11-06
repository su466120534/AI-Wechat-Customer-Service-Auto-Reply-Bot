import dotenv from 'dotenv'
import inquirer from 'inquirer'
import { getAitiwoReply } from '../aitiwo/index.js'
const env = dotenv.config().parsed

async function handleRequest(type) {
  console.log('type: ', type)
  if (env.AITIWO_URL && env.AITIWO_API_KEY) {
    const message = await getAitiwoReply('hello')
    console.log('🌸🌸🌸 / reply: ', message)
    return
  }
  console.log('❌ 请先配置.env文件中的 AITIWO_URL 和 AITIWO_API_KEY')
}

const serveList = [
  { name: 'aitiwo', value: 'aitiwo' },
]

const questions = [
  {
    type: 'list',
    name: 'serviceType',
    message: '请先选择服务类型',
    choices: serveList,
  },
]

function init() {
  inquirer
    .prompt(questions)
    .then((res) => {
      handleRequest(res.serviceType)
    })
    .catch((error) => {
      console.log('🚀error:', error)
    })
}

init()
