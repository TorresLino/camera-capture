import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Parameterized configuration values from env or defaults
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS, 10) || 5000
const BROADCAST_INTERVAL_MS = parseInt(process.env.BROADCAST_INTERVAL_MS, 10) || 15000
const HIGH_THRESHOLD = parseFloat(process.env.HIGH_THRESHOLD) || 55.0
const LOW_THRESHOLD = parseFloat(process.env.LOW_THRESHOLD) || 45.0

const BUFFER_SIZE = Math.max(1, Math.round(BROADCAST_INTERVAL_MS / POLL_INTERVAL_MS))

// Linux IIO Sensor paths for DHT11 on Raspberry Pi
const HUMIDITY_PATH = '/sys/bus/iio/devices/iio:device0/in_humidityrelative_input'
const TEMP_PATH = '/sys/bus/iio/devices/iio:device0/in_temp_input'

if (!fs.existsSync(HUMIDITY_PATH) || !fs.existsSync(TEMP_PATH)) {
  console.error(`[Fatal Error] DHT11 sensor paths not found at expected IIO locations:`)
  console.error(`- Humidity: ${HUMIDITY_PATH}`)
  console.error(`- Temperature: ${TEMP_PATH}`)
  console.error(`Ensure kernel overlay dtoverlay=dht11 is configured and active.`)
  process.exit(1)
}

console.log("DHT11 sensor device nodes verified successfully.")

// Current environmental state
let currentData = {
  humidity: 0.0,
  temperature: 0.0,
  state: 'normal',
  statusText: `Normal (${LOW_THRESHOLD}% - ${HIGH_THRESHOLD}%)`
}

// Rolling sample window
let sampleBuffer = []

function pollSensor() {
  try {
    const rawHumid = fs.readFileSync(HUMIDITY_PATH, 'utf8').trim()
    const rawTemp = fs.readFileSync(TEMP_PATH, 'utf8').trim()

    const hum = parseFloat(rawHumid) > 100 ? parseFloat(rawHumid) / 1000 : parseFloat(rawHumid)
    const temp = parseFloat(rawTemp) > 100 ? parseFloat(rawTemp) / 1000 : parseFloat(rawTemp)

    if (isNaN(hum) || isNaN(temp) || temp < 0 || temp > 60 || hum < 0 || hum > 100) {
      console.warn(`[Sensor Warning] Discarding out-of-bounds reading -> Temp: ${temp}, Humid: ${hum}`)
      return
    }

    sampleBuffer.push({ humidity: hum, temperature: temp })
    if (sampleBuffer.length > BUFFER_SIZE) {
      sampleBuffer.shift()
    }
  } catch (err) {
    console.error('[Sensor Error] Failed to read hardware sensor values:', err.message)
    throw err
  }
}

// Compute average and evaluate thresholds using parameterized limits
function processAndBroadcast() {
  if (sampleBuffer.length === 0) return

  const avgHumid = sampleBuffer.reduce((acc, curr) => acc + curr.humidity, 0) / sampleBuffer.length
  const avgTemp = sampleBuffer.reduce((acc, curr) => acc + curr.temperature, 0) / sampleBuffer.length

  currentData.humidity = avgHumid
  currentData.temperature = avgTemp

  // Evaluate parameterized thresholds
  if (currentData.humidity > HIGH_THRESHOLD) {
    currentData.state = 'high'
    currentData.statusText = `High Humidity (> ${HIGH_THRESHOLD}%)`
  } else if (currentData.humidity < LOW_THRESHOLD) {
    currentData.state = 'low'
    currentData.statusText = `Low Humidity (< ${LOW_THRESHOLD}%)`
  } else {
    currentData.state = 'normal'
    currentData.statusText = `Normal (${LOW_THRESHOLD}% - ${HIGH_THRESHOLD}%)`
  }

  console.log(`[Averaged] Temp: ${currentData.temperature.toFixed(1)}°C | Humidity: ${currentData.humidity.toFixed(1)}% | Status: ${currentData.state}`)
}

try {
  pollSensor()
  processAndBroadcast()
} catch (err) {
  console.error('[Fatal Error] Initial sensor read failed on startup. Exiting.')
  process.exit(1)
}

setInterval(() => {
  try {
    pollSensor()
  } catch (err) {
    console.error('[Warning] Continuing despite polling error...')
  }
}, POLL_INTERVAL_MS)

setInterval(processAndBroadcast, BROADCAST_INTERVAL_MS)

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')))

// Server-Sent Events (SSE) endpoint for real-time web UI updates
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendUpdate = () => {
    res.write(`data: ${JSON.stringify(currentData)}\n\n`)
  }

  sendUpdate()
  const interval = setInterval(sendUpdate, 2000)

  req.on('close', () => {
    clearInterval(interval)
  })
})

app.listen(PORT, () => {
  console.log(`Web server running at http://localhost:${PORT}`)
})

// Cleanup on exit
process.on('SIGINT', () => {
  process.exit()
})