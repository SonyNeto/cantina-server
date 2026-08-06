/**
 * ATTENTION:
 * This script will delete all data in the database configured in the .env.dev file
 * before recreating the seed data.
 */

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.dev' });
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Workspace = require('../models/workspace');
const Membership = require('../models/membership');
const Shift = require('../models/shift');
const SchoolClass = require('../models/schoolClass');
const MenuItem = require('../models/menuItem');
const Order = require('../models/order');
const Register = require('../models/register');
const Responsible = require('../models/responsible');
const Student = require('../models/student');

const ADMIN_EMAIL = 'admin@teste.com';
const ADMIN_PASSWORD = 'admin123';

async function seed() {
  await mongoose.connect(process.env.DB_URL);

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Register.deleteMany({}, { session });
      await Order.deleteMany({}, { session });
      await Student.deleteMany({}, { session });
      await Responsible.deleteMany({}, { session });
      await MenuItem.deleteMany({}, { session });
      await SchoolClass.deleteMany({}, { session });
      await Shift.deleteMany({}, { session });
      await Membership.deleteMany({}, { session });
      await Workspace.deleteMany({}, { session });
      await User.deleteMany({}, { session });

      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 8);

      const [user] = await User.insertMany(
        [
          {
            email: ADMIN_EMAIL,
            password: hashedPassword,
            isSystemAdmin: true,
          },
        ],
        { session },
      );

      const [workspace] = await Workspace.insertMany(
        [
          {
            name: 'Ex cola',
            ownerId: user._id,
          },
        ],
        { session },
      );

      await Membership.insertMany(
        [
          {
            userId: user._id,
            workspaceId: workspace._id,
            role: 'owner',
          },
        ],
        { session },
      );

      const [shift] = await Shift.insertMany(
        [
          {
            label: 'Turno',
            workspaceId: workspace._id,
          },
        ],
        { session },
      );

      const [schoolClass] = await SchoolClass.insertMany(
        [
          {
            label: 'Turma',
            workspaceId: workspace._id,
            shiftId: shift._id,
          },
        ],
        { session },
      );

      const menuItems = await MenuItem.insertMany(
        [
          {
            label: 'Strognogofe',
            workspaceId: workspace._id,
            price: 550,
          },
          {
            label: 'Ovo',
            workspaceId: workspace._id,
            price: 150,
          },
          {
            label: 'Strudel',
            workspaceId: workspace._id,
            price: 650,
          },
        ],
        { session },
      );

      const responsibles = await Responsible.insertMany(
        [
          {
            name: 'Fulano',
            workspaceId: workspace._id,
            balance: 0,
          },
          {
            name: 'Sicrano',
            workspaceId: workspace._id,
            balance: 10000,
          },
        ],
        { session },
      );

      const students = await Student.insertMany(
        [
          {
            name: 'Filho de Fulano',
            workspaceId: workspace._id,
            responsibleId: responsibles[0]._id,
            classId: schoolClass._id,
          },
          {
            name: 'Filho de Sicrano',
            workspaceId: workspace._id,
            responsibleId: responsibles[1]._id,
            classId: schoolClass._id,
          },
        ],
        { session },
      );

      await Order.insertMany(
        [
          {
            workspaceId: workspace._id,
            studentId: students[0]._id,
            created_at: new Date(),
            payment: 0,
            keepChange: false,
            details: 'Strognogofe sem batata palha',
            items: [
              {
                product: {
                  id: menuItems[0]._id,
                  label: menuItems[0].label,
                  price: menuItems[0].price,
                },
                status: 'cooking',
              },
            ],
          },
          {
            workspaceId: workspace._id,
            studentId: students[1]._id,
            created_at: new Date(),
            payment: 20000,
            keepChange: true,
            items: [
              {
                product: {
                  id: menuItems[1]._id,
                  label: menuItems[1].label,
                  price: menuItems[1].price,
                },
                status: 'ready',
              },
              {
                product: {
                  id: menuItems[2]._id,
                  label: menuItems[2].label,
                  price: menuItems[2].price,
                },
                status: 'cooking',
              },
            ],
          },
        ],
        { session },
      );

      await Register.insertMany(
        [
          {
            workspaceId: workspace._id,
            product: {
              id: menuItems[0]._id,
              label: menuItems[0].label,
              price: menuItems[0].price,
            },
            created_at: new Date(),
            payment: 0,
            studentId: students[0]._id,
          },
        ],
        { session },
      );
    });

    console.log(
      '✅ Seed gerada com sucesso!\nUsuário administrador: %s\nSenha: %s',
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
    );
  } catch (error) {
    console.error('❌ Erro ao gerar seed:', error);
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
}

seed();
