/*
    Poblador de Students para inyectar data a la BD
*/

import { PrismaClient, StatusStudent } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/es';
import moment from 'moment';

const N_PEDIATRICIAN = 20;
const N_FAMILY = 10;
const N_CITY = 5;
const N_PARENT = 40;
const N_PROGRAM = 10;

const COUNT = 40;

const generateFakeData = () => {
    const fakeStudents = [];

    for (let i = 0; i < COUNT; i++) {
        const fakeItem = {
            name: faker.name.firstName(),
            lastName1: faker.name.lastName(),
            lastName2: faker.name.lastName(),
            status: getRandomStatus(),
            commentary: faker.lorem.lines(1),
            dateBirth: moment(faker.date.birthdate({ min: 0, max: 5, mode: 'age' })).format("YYYY-MM-DD"),
            housePhone: faker.phone.number('(###) ###-###'),
            address: faker.address.streetAddress(false),
            medicalCondition: faker.lorem.lines(1),
            progressDesired: faker.lorem.lines(1),
            allowedPictures: faker.datatype.boolean(),
            idPediatrician: Math.floor(Math.random() * N_PEDIATRICIAN) + 1,
            idFamily: Math.floor(Math.random() * N_FAMILY) + 1,
            idCity: Math.floor(Math.random() * N_CITY) + 1,
            idParent: Math.floor(Math.random() * N_PARENT) + 1,
            idProgram: Math.floor(Math.random() * N_PROGRAM) + 1,
        };
        fakeStudents.push(fakeItem);
    }

    return fakeStudents;
};

function getRandomStatus(): StatusStudent {
  const enumValues = Object.values(StatusStudent);
  const randomIndex = Math.floor(Math.random() * enumValues.length);
  return enumValues[randomIndex];
}


const insertFakeData = async () => {
    const prisma = new PrismaClient();
    const fakeStudents = generateFakeData();
  
    try {
      const result = await prisma.student.createMany({ data: fakeStudents });
      console.log(`Se insertaron ${result.count} registros en la tabla "Student"`);
    } catch (error) {
      console.error('Error al insertar datos falsos:', error);
    } finally {
      await prisma.$disconnect();
    }
  };
  
//   EJECUTAR SEEDER
  insertFakeData();
  