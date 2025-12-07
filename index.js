import * as Webcam from 'node-webcam'
import * as fs from 'fs'
import * as cron from 'node-cron'

const {
    SAVE_DIR,
    WIDTH = '1920',
    HEIGHT = '1080',
    QUALITY = '90',
    DELAY = '2',
    DEVICE = '/dev/video0',
    FRAMES = '1',
    SKIP = '10',
    CRON_SCHEDULE = '*/2 * * * *'
} = process.env

if (SAVE_DIR == null || SAVE_DIR.trim().length === 0) {
    throw new Error('Please specify a directory for saving the images by setting "SAVE_DIR" in the .env file.')
}

const parseInt = (value) => {
    if (typeof value === 'number') {
        return value
    }

    const parsed = Number.parseInt(value)

    if (Number.isNaN(parsed)) {
        throw new Error(`Failed to parse ${value} to an integer`)
    }

    return parsed
}

fs.mkdirSync(SAVE_DIR, { recursive: true })

const options = {
    saveShots: true,
    output: SAVE_DIR,
    filename,

    width: parseInt(WIDTH),
    height: parseInt(HEIGHT),
    quality: parseInt(QUALITY),
    delay: parseInt(DELAY),

    external: false,
    callbackReturn: 'location',

    device: DEVICE,
    verbose: false,
    frames: parseInt(FRAMES),
    skip: parseInt(SKIP),
    configure: {
        '--no-banner': ''
    }
}

const capture = () => {
    const now = new Date()
    const filename = `${now.getFullYear()}-${now.getMonth()}-${now.getDay()}T${now.getHours()}:${now.getMinutes()}:00`

    const client = Webcam.create(options)

    client.capture('temp_shot', (error, data) => {
        if (error) {
            throw new Error('Failed capturing image: ', error)
        }

        console.log(`Image saved successfully: ${SAVE_DIR}/${filename}`)
    })
}

cron.schedule(CRON_SCHEDULE, capture)