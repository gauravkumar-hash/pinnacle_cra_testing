import { ApiError } from "../services/client";
import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

const dateFormat = 'YYYY-MM-DD';
const timeFormat = 'HH:mm:ss';
export const strToDate = (dateStr: string) => dayjs(dateStr, dateFormat);
export const dateToStr = (date: Dayjs) => date.format(dateFormat)
export const strToTime = (timeStr: string) => dayjs(timeStr, timeFormat);
export const timeToStr = (time: Dayjs) => time.format(timeFormat);
export const titleCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
export const getErrorMsg = (error: ApiError) => {
    if (error.status == 422) {
        return `${error.statusText}: ${(error.body as any).detail?.map((detail: any) => detail.loc[1]).join(', ')}`
    }
    return (error.body as { detail?: string })?.detail ?? error.message;
}
