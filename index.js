import Webcam from 'node-webcam'
import * as fs from 'fs'
import * as cron from 'node-cron'
import * as path from 'path'

const {
    SAVE_DIR,
    WIDTH = '1920',
    HEIGHT = '1080',
    QUALITY = '90',
    DEVICE = '/dev/video0',
    FRAMES = '1',
    SKIP = '60',
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

const capture = () => {
    const now = new Date()
    const filename = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDay()}T${now.getHours()}:${now.getMinutes()}:00.jpg`
    const location = path.join(SAVE_DIR, filename)

    const options = {
        width: parseInt(WIDTH),
        height: parseInt(HEIGHT),
        quality: parseInt(QUALITY),
        output: 'jpeg',

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

    const client = Webcam.create(options)

    client.capture(location, (error, data) => {
        if (error) {
	    console.error(error)
            throw new Error('Failed capturing image: ', error)
        }

        console.log(`Image saved successfully: ${location}`)
    })
}

cron.schedule(CRON_SCHEDULE, capture)

