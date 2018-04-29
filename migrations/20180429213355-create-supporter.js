'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Supporters', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      username: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      historyId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Histories',
          key: 'id'
        }
      }
 
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Supporters');
  }
};