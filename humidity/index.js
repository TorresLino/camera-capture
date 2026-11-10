const express = require('express')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// RGB LED GPIO Pins (BCM Pin Numbers)
const PIN_RED = 17
const PIN_GREEN = 27
const PIN_BLUE = 22

// Linux IIO Sensor paths for DHT11 on Raspberry Pi
const HUMIDITY_PATH = '/sys/bus/iio/devices/iio:device0/in_humidityrelative_input'
const TEMP_PATH = '/sys/bus/iio/devices/iio:device0/in_temp_input'

let rpio = null
let isPi = false

try {
  rpio = require('rpio')
  if (fs.existsSync(HUMIDITY_PATH)) {
    isPi = true
    rpio.open(PIN_RED, rpio.OUTPUT, rpio.LOW)
    rpio.open(PIN_GREEN, rpio.OUTPUT, rpio.LOW)
    rpio.open(PIN_BLUE, rpio.OUTPUT, rpio.LOW)
    console.log("Hardware GPIO initialized successfully.")
  } else {
    console.log("DHT11 sensor device node not found. Running in simulation/development mode.")
  }
} catch (e) {
  console.log("rpio not supported on this architecture. Running in simulation/development mode.")
}

function setRGBColor(red, green, blue) {
  if (!isPi || !rpio) return
  rpio.write(PIN_RED, red ? rpio.HIGH : rpio.LOW)
  rpio.write(PIN_GREEN, green ? rpio.HIGH : rpio.LOW)
  rpio.write(PIN_BLUE, blue ? rpio.HIGH : rpio.LOW)
}

// Current environmental state
let currentData = {
  humidity: 50.0,
  temperature: 22.0,
  state: 'normal',
  statusText: 'Normal (45% - 55%)'
}

// Read Sensor Data every 15 seconds
function sampleSensor() {
  try {
    if (isPi && fs.existsSync(HUMIDITY_PATH)) {
      const rawHumid = fs.readFileSync(HUMIDITY_PATH, 'utf8').trim()
      const rawTemp = fs.readFileSync(TEMP_PATH, 'utf8').trim()

      currentData.humidity = parseFloat(rawHumid) > 100 ? parseFloat(rawHumid) / 1000 : parseFloat(rawHumid)
      currentData.temperature = parseFloat(rawTemp) > 100 ? parseFloat(rawTemp) / 1000 : parseFloat(rawTemp)
    } else {
      // Simulated fluctuation for local development/testing
      currentData.humidity = 40 + Math.random() * 25 // Random between 40% and 65%
      currentData.temperature = 20 + Math.random() * 5
    }

    // Evaluate thresholds
    if (currentData.humidity > 55) {
      currentData.state = 'high'
      currentData.statusText = 'High Humidity (> 55%)'
      setRGBColor(true, false, false) // Red
    } else if (currentData.humidity < 45) {
      currentData.state = 'low'
      currentData.statusText = 'Low Humidity (< 45%)'
      setRGBColor(false, false, true) // Blue
    } else {
      currentData.state = 'normal'
      currentData.statusText = 'Normal (45% - 55%)'
      setRGBColor(false, true, false) // Green
    }

    console.log(`[Sensor] Temp: ${currentData.temperature.toFixed(1)}°C | Humidity: ${currentData.humidity.toFixed(1)}% | Status: ${currentData.state}`)
  } catch (err) {
    console.error('Error reading sensor:', err.message)
  }
}

// Start sampling interval (15 seconds)
setInterval(sampleSensor, 15000)
sampleSensor()

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
  if (isPi && rpio) {
    setRGBColor(false, false, false)
    rpio.close(PIN_RED)
    rpio.close(PIN_GREEN)
    rpio.close(PIN_BLUE)
  }
  process.exit()
})