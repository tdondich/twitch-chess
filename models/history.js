'use strict';
module.exports = (sequelize, DataTypes) => {
  var History = sequelize.define('History', {
    side: DataTypes.ENUM('WHITE', 'BLACK'),
    username: DataTypes.STRING,
    position_model: DataTypes.TEXT,
    pgn: DataTypes.STRING,
    move: DataTypes.STRING
  }, {});
  History.associate = function(models) {
    // associations can be defined here
    models['History'].belongsTo(models['Game'])
  };
  return History;
};