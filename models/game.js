'use strict';
module.exports = (sequelize, DataTypes) => {
  var Game = sequelize.define('Game', {
    winner: { type: DataTypes.ENUM('WHITE', 'BLACK', DataTypes.NULL), defaultValue: DataTypes.NULL }
  }, {});
  Game.associate = function(models) {
    // associations can be defined here
  };
  return Game;
};