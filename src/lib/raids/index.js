'use strict'

const Group = require('./models/Group')
const Raid = require('./models/Raid')
const rk = require('randomkey')
let date = new Date()
let current_time = date.setMinutes(date.getMinutes())

// TODO: Need expire command

class Raids {

  /**
   * Method adds a raid
   * @param {String} pokemon - Pokemon in query 
   * @param {Number} expiration_time - Minutes Left
   * @param {Number} expiration_time_string - Time String of Expiration as a Date Object
   * @param {String} formatted_time - Formatted Time
   * @param {String} location - URL or Query of Location
   */
  static add(pokemon, expiration_time, expiration_time_string, formatted_time, channel, location) {
    return new Promise((resolve, reject) => {
      let id = rk(4, rk.alphanumeric)

      Raid
        .findOne({ pokemon, formatted_time, location })
        .where('channel').equals(channel)
        .exec((err, doc) => {
          if(err) reject(err)
          if(doc !== null) reject(`Raid for ** ${doc.pokemon} ** at ${doc.formatted_time} already exists. Please reference: ${doc.id}`)
          if(doc === null) {
            let raid = new Raid({ 
              id,
              pokemon,
              expiration_time,
              expiration_time_string,
              formatted_time,
              channel,
              location
            })
            raid.save(err => { 
              if(err) {
                console.log(err)
                reject(err)
              } 
            })
            resolve(raid)
          }
        })
    })
  }

  /**
   * Returns a list of raids if available
   * Fallback message is included 
   * @param {string} channel - Takes the channel name
   */
  static listByChannel(channel) {
    return new Promise((resolve, reject) => {
      Raid.
        find({ channel }).where('expiration_time').gte(current_time).exec((err, data) => {
          if (err) reject(err)
          if (data.length <= 0) reject(`There are raids reported in ** #${channel} ** at this time`)
          if (data.length > 0) resolve(data)
        })
    })
  }

  static listByPokemon(channel, pokemon) {
    return new Promise((resolve, reject) => {
      Raid.
        find({ channel, pokemon }).where('expiration_time').gte(current_time).exec((err, data) => {
          if (err) reject(err)
          if (data.length <= 0) { 
            reject(`No current raids are reported for ${pokemon} in ${channel}, at this time`)
          }
          else {
            resolve(data)
          }
        })
    })
  }

  /**
   * This method is meant to remove all the expired raids from the Database
   */
  static expire() {
    Raid.deleteMany({ expiration_time: { $lte: current_time } })
      .then(() => console.log(`Deleted raids after ${current_time}`))
      .catch(err => console.log(`Error at expire method: ${err}`))
  }

}

class Groups {
  /**
   * 
   * @param {String} id - This is raid ID that is referenced back in the Raid Class
   * @param {String} author - The Author's message to indicate who created the group
   * @param {String} channel - The channel where message was indicated to reference region
   * @param {Number} start_time - Start time of the group
   * @param {String} start_time_string - Start time of the group (Date format for use of TTL)
   * @param {String} formatted_time - Formatted time of the start time
   * @param {Number} num_of_players - This is optional, if the starter has friends coming
   */
  static start(id, author, channel, start_time, start_time_string, formatted_time, num_of_players = 0) {
    let group_id = rk(3, rk.alphanumeric)
    return new Promise((resolve, reject) => {
      Raid.findOne({ id }).
        where('expiration_time').gte(current_time).
        where('channel').equals(channel).
        exec((err, data) => {
          if (err) reject(`Something went wrong with starting the group, ping @adcoord.`)
          if (data === null) { reject(`No raid ${id} found in this ${channel}. Please check again`)}
          if (data !== null && start_time >= data.expiration_time) { reject(`Invalid. 
          You requested to start at ${formatted_time}, but the raid expires at ${data.formatted_time}. 
          Please try again.`)}

          if (data !== null) {
            var group = new Group({
              group_id,
              leader: author,
              num_of_players: num_of_players,
              players: [author],
              pokemon: data.pokemon,
              location: data.location,
              channel: data.channel,
              start_time,
              start_time_string,
              formatted_time
            })
            
            group.save(err => { if(err) reject(err) })
            resolve(group)
          }
        })
    })
  }

  static joinGroup(id, author, channel, num_of_players = 1) {
    return new Promise((resolve, reject) => {
      Group.
        findOneAndUpdate({ id }, { $push: { players: author }, $inc: { number_of_players: num_of_players } }, { new: true } ).
        where('start_time').gte(current_time).
        where('channel').equals(channel).
        exec((err, data) => {
          if (err) { reject(err) }
          if (!data) { resolve(`No group ${id} found in this ${channel}. Please check your group ID` )}
          if (data) { resolve(data) }
        })
    })
  }
  
  static listByChannel(channel) {
    return new Promise((resolve,  reject) => {
      Group.find({ channel }).where('start_time').gte(current_time).exec((err, data) => {
        if(err) {
          reject(`Something went wrong with listing your groups by ${channel}, ping @adcoord.`)
        }
        if(data.length <= 0) { reject (`There are currently no groups for list of raids in ${channel}`) }
        if(data.length > 0) { 
          resolve(data) 
        }
      })
    })
  }

  static listByPokemon(channel, pokemon) {
    return new Promise((resolve, reject) => {
      Group.find({ channel }, { pokemon }).where('start_time').gte(current_time).exec((err, data) => {
        if(err) reject(`Something went wrong with listing groups for ${pokemon} in ${channel}, ping @adcoord. `)
        if(data.length <= 0) {reject(`There are currently no groups for ${pokemon} in ${channel}`)}
        if(data.length <= 0) {resolve(data)}
      })
    })
  }

  static expire() {
    Raid.deleteMany({ expiration_time: { $lte: current_time } })
      .then(() => console.log(`Deleted raids after ${current_time}`))
      .catch(err => console.log(`Error at expire method: ${err}`))
  }
}

module.exports = {
  Raids,
  Groups
}