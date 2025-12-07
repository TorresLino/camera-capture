import dayjs from "dayjs"
import save from "./save.js"

const dayValue = process.argv[2]

if (dayValue == null || dayValue.trim().length === 0) {
    console.log('Please provide a date stamp as an argument to the script: npm run save -- 2025-12-07')
}

const normalizedDay = dayjs(dayValue).format('YYYY-MM-DD')

void save(normalizedDay)
