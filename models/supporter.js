'use strict';
module.exports = (sequelize, DataTypes) => {
  var Supporter = sequelize.define('Supporter', {
    username: DataTypes.STRING
  }, {});
  Supporter.associate = function(models) {
    // associations can be defined here
    models['Supporter'].belongsTo(models['History'])
  };
  return Supporter;
};