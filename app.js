const express = require('express')
const fetch = require('node-fetch')
const bodyParser = require('body-parser')

const app = express()
const port = process.env.PORT || 5000
app.use(bodyParser.json())

// tokens, secrets
const TGtoken = 'bot token in telegram'
const TGchatID = 'chat ID of the channel in telegram'
const GASmacroURL = 'google apps scripts excuting URL'
const oneSignalAppID = 'oneSignal app ID'
const oneSignalAPIkey = 'oneSignal api key'
const oneSignalSegment = 'oneSignal segment'

app.post('/', async (req, res) => {
  res.status(200).send('OK')
  let json = req.body.post.current
  if (!json) {
    console.log(`got undefined call.. this is the content: ${req.body}`)
  } else {
    let { url, title, custom_excerpt } = json
    const oneSignal = await OneSignalPush(title, custom_excerpt, url)
    const GASrequest = await GASpost(json)
    const telegrampost = await telegramPush(custom_excerpt, url)
    return `result: telegram - error code is ${telegrampost.status}, description is ${telegrampost.description}.\ngoogle script status is ${GASrequest.status}\noneSignal status is ${oneSignal.status}, recipients is ${oneSignal.recipients}`
  }
});

app.listen(port, () => { console.log(`app started 🚀 and listening at http://localhost:${port}`) })

async function telegramPush(custom_excerpt, url) {
  let message = encodeURI(`${custom_excerpt}\n${url}`) // '\n' or '%0a' is line-break
  const response = await fetch(`https://api.telegram.org/bot${TGtoken}/sendMessage?chat_id=${TGchatID}&text=${message}&parse_mode=markdown`)
  const result = await response.json();
  return { status: result.error_code, description: result.description }
}

async function GASpost(json) {
  const response = await fetch(`${GASmacroURL}`, { method: 'POST', Headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) })
  return { status: response.status }
}

async function OneSignalPush(title, custom_excerpt, url) {
  let message = {
    app_id: `${oneSignalAppID}`,
    headings: { 'en': `${title}` },
    contents: { 'en': `${custom_excerpt}` },
    url: `${url}`,
    included_segments: [`${oneSignalSegment}`]
  }
  let headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': `Basic ${oneSignalAPIkey}`
  }
  const response = await fetch('https://onesignal.com/api/v1/notifications', { method: 'POST', headers: headers, body: JSON.stringify(message) })
  const result = await response.json()
  return { status: response.status, recipients: result.recipients }
}