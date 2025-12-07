import { promises } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import dayjs from 'dayjs'

const {
    CAPTURE_DIR,
    SAVE_DIR,
    SAVE_FRAME_RATE = 24
} = process.env

const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Command failed ${command}\nStderr: ${stderr}`)
                return reject(error)
            } if (stderr) {
                console.warn(`Warning for command ${command}:\n${stderr}`)
            }

            resolve(stdout)
        })
    })
}

const save = async () => {
    if (SAVE_DIR == null || SAVE_DIR.trim().length === 0) {
        throw new Error('Please specify a directory for saving the videos by setting "SAVE_DIR" in the .env file.')
    }

    if (CAPTURE_DIR == null || CAPTURE_DIR.trim().length === 0) {
        throw new Error('Please specify a directory for where the images are saved by setting "CAPTURE_DIR" in the .env file.')
    }

    const todayString = dayjs().format('YYYY-MM-DD')
    const regexPattern = `^${todayString}[T].*\\.jpg$`
    const regex = new RegExp(regexPattern)
    const files = await promises.readdir(CAPTURE_DIR)
    const todaysImages = files.filter(file => file.match(regex))
        .sort()

    if (todaysImages.length === 0) {
        console.error('No images found for processing')
        return
    }

    if (files.length !== todaysImages.length) {
        console.warn('There are excess images in the capture folder.')
    }

    const videoName = `${todayString}.mp4`
    const zipName = `${todayString}.zip`

    await promises.mkdir(SAVE_DIR, { recursive: true })

    console.log('Saving video...')
    const videoPath = path.join(SAVE_DIR, videoName)

    const fileListContent = todaysImages.map(file => `file '${path.join(IMAGE_DIR, file)}'`).join('\n')
    const listFilePath = path.join('/tmp', `filelist_${todayString}.txt`)
    await promises.writeFile(listFilePath, fileListContent)

    const ffmpegCommand = `ffmpeg -f concat -safe 0 -r ${SAVE_FRAME_RATE} -i ${listFilePath} -c:v libx264 -pix_fmt yuv420p ${videoPath} -y`
    await runCommand(ffmpegCommand)

    await fs.unlink(listFilePath)
    console.log(`Video saved successfully: ${videoName}`)

    console.log('Compressing used images...')
    const zipPath = path.join(SAVE_DIR, zipName)
    const zipCommand = `cd ${CAPTURE_DIR} && find . -maxdepth 1 -type f -name "${todayString}T*.jpg" -print0 | xargs -0 zip -@ ${zipPath}`

    await runCommand(zipCommand)
    console.log(`Successfully compressed used images: ${zipName}`)

    console.log('Removing processed files...')
    const deletePromises = todaysImages.map(file => promises.unlink(path.join(CAPTURE_DIR, file)))
    await Promise.all(deletePromises)
    console.log('Successfully removed processed files')
}

export default save
