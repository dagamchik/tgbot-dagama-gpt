import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import config from 'config'
import { code } from 'telegraf/format'
import { ogg } from './ogg.js'
import { openai } from './openai.js'

console.log(config.get('TEST_ENV'))

const INITIAL_SESSION = {
    messages: [],
}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use(session())

bot.command('new', async(ctx) => {
    ctx.session = INITIAL_SESSION
    await ctx.reply('Отправь мне голосовое, либо напиши текстом')
})
bot.command('start', async(ctx) => {
    ctx.session = INITIAL_SESSION
    await ctx.reply('Отправь мне голосовое, либо напиши текстом')
})

bot.on(message('voice'), async ctx => {
    ctx.session ??= INITIAL_SESSION
    try {
        // await ctx.reply(JSON.stringify(ctx.message.voice, null, 2))
        await ctx.reply(code('Я тебя понял, сейчас подумаю как ответить...'))
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
        const userId = String(ctx.message.from.id)
        const oggPath = await ogg.create(link.href, userId)
        const mp3Path = await ogg.toMp3(oggPath, userId)

        const text = await openai.transcription(mp3Path)
        await ctx.reply(code(`Ваш запрос: ${text}`))

        ctx.session.messages.push({ role: openai.roles.USER, content: text })
        console.log('msgs:', ctx.session.messages)
        const reponse = await openai.chat(ctx.session.messages)


        console.log('reponse:', reponse.content)
        ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: reponse.content })

        await ctx.reply(reponse.content)
    } catch(e) {
        await ctx.reply('Задайте другой вопрос, пожалуйста :)')
        console.log('Error voice message:', e.message)
    }
})

bot.on(message('text'), async ctx => {
    ctx.session ??= INITIAL_SESSION
    try {
        // await ctx.reply(JSON.stringify(ctx.message.voice, null, 2))
        await ctx.reply(code('Я тебя понял, сейчас подумаю как ответить...'))

        ctx.session.messages.push({ role: openai.roles.USER, content: ctx.message.text })

        console.log('msgs:', ctx.session.messages)
        const reponse = await openai.chat(ctx.session.messages)

        console.log('reponse:', reponse.content)
        ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: reponse.content })

        await ctx.reply(reponse.content)
    } catch(e) {
        await ctx.reply('Задайте другой вопрос, пожалуйста :)')
        console.log('Error TEXT message:', e.message)
    }
})


bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))