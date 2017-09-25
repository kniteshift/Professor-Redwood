'use strict'
/**
 * List by Channel and List by Pokemon Method
 */
const Raids = require('../lib/raids').Raids
const usage = 'Raids command: **!raids** OR **!raids <raid boss>**'

const raids = (data, message) => {
  let { content, channel } = message
  content = content.toLowerCase().split(' ')

  // if the user's argument is !raid and nothing else
  if(content.length == 1) {
    Raids
      .listByChannel(channel.name)
      .then((raids) => {
        let list = raids.map(raid => `** ${raid.id} ** - ${raid.pokemon} ends at ${raid.formatted_time}, found at: ${raid.location} \n`).join('\n')
        channel.send(list)
      })
      .catch(err => channel.send(err))
  }
  
  if (content.length > 1) {
    Raids
      .listByPokemon(channel.name, content[1])
      .then((raids) => {
        let list = raids.map(raid => `** ${raid.id} ** - ${raid.pokemon} ends at ${raid.formatted_time}, found at: ${raid.location} \n`).join('\n')
        channel.send(list)
      })
      .catch(err => channel.send(err))
  }
}

module.exports = (data) => ( (message) => {
  return raids(data, message)
})