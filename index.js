import capture from './capture'
import save from './save'
import * as cron from 'node-cron'

const {
    CAPTURE_CRON_SCHEDULE = '*/2 * * * *',
    SAVE_CRON_SCHEDULE = '59 23 * * *'
} = process.env

cron.schedule(CAPTURE_CRON_SCHEDULE, capture)
cron.schedule(SAVE_CRON_SCHEDULE, save)
