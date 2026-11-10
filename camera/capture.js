import Webcam from 'node-webcam'
import * as fs from 'fs'
import * as path from 'path'
import dayjs from 'dayjs'

const {
    CAPTURE_DIR,
    WIDTH = '1920',
    HEIGHT = '1080',
    QUALITY = '90',
    DEVICE = '/dev/video0',
    FRAMES = '1',
    SKIP = '60',
    EXPOSURE_TIME
} = process.env

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

const capture = () => {
    if (CAPTURE_DIR == null || CAPTURE_DIR.trim().length === 0) {
        throw new Error('Please specify a directory for saving the images by setting "CAPTURE_DIR" in the .env file.')
    }

    fs.mkdirSync(CAPTURE_DIR, { recursive: true })
    const filename = `${dayjs().format('YYYY-MM-DDTHH:mm:ss')}.jpg`
    const location = path.join(CAPTURE_DIR, filename)

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

    if (EXPOSURE_TIME != null && EXPOSURE_TIME.trim().length > 0) {
        options.configure['--set'] = [
            `Auto Exposure=1`,
            `Exposure Time, Absolute=${parseInt(EXPOSURE_TIME)}`
        ]
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

export default capture
