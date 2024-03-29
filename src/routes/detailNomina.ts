import { Router, response } from 'express';
import { PrismaClient } from '@prisma/client'
import validator from '../utils/validatorUtils';
import resProcessor from '../utils/responseProcessor';
import errorHandler from '../handlers/errorHandler';
import nominaHanlder from '../handlers/nominaHandler';

const router = Router();
const prisma = new PrismaClient()

function handleError(error: any) {
    const object = "Detail Nomina";
    return errorHandler.checkError(object, error);
}

router.get('/new', async (req, res) => {
    let response;
    try {
        const nominas = await prisma.nomina.findMany({
            where: { deleted: false },
            select: {
                id: true,
                date: true,
            }
        })

        const staff = await prisma.staff.findMany({
            where: { deleted: false, status: true },
            select: {
                id: true,
                name: true,
                lastName1: true,
                lastName2: true,
                salary: true,
            }
        })

        response = {
            nominas: nominas,
            staff: staff
        }

    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, response));
});

// LISTAR MEDIANTE ID
router.get('/:idNomina', async (req, res) => {
    const { idNomina } = req.params

    if (!idNomina || !validator.isNumeric(idNomina)) {
        return res.json(resProcessor.newMessage(400, "[Deatil Nomina] Se recibio un idNomina invalido al buscar los detalles de nomina"))
    }

    let response, nominas;
    try {
        nominas = await prisma.detailNomina.findMany({
            where: {
                idNomina: Number(idNomina),
                deleted: false,
            },
            select: {
                salary: true,
                extraDays: true,
                overtimePay: true,
                sfs: true,
                afp: true,
                loans: true,
                other: true,
                total: true,

                staff: {
                    select: {
                        id: true,
                        name: true,
                        lastName1: true,
                        lastName2: true,
                        position: true,
                        status: true
                    }
                },
            }
        })

        const date = await prisma.nomina.findUnique({
            where: {
                id: Number(idNomina)
            },
            select: {
                date: true,
            }
        })

        const totals = await nominaHanlder.getNominaTotals(Number(idNomina))

        response = {
            nominas: nominas,
            totals: totals,
            date: date ? date.date : "Registro no encontrado" 
        }

        if (date) {
            res.json(resProcessor.concatStatus(200, response, nominas.length));
        } else {
            res.json(resProcessor.concatStatus(400, response, nominas.length));
        }
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }
})

// CHECK MEDIANTE ID
router.get('/validate/:idNomina/:idStaff', async (req, res) => {
    const { idNomina, idStaff } = req.params

    let nomina;
    try {
        nomina = await prisma.detailNomina.findUnique({
            where: {
                idNomina_idStaff: {
                  idNomina: Number(idNomina),
                  idStaff: Number(idStaff),
                },
            },
            select: { 
                deleted: true
            }
        })

        if (nomina) {
            res.json(resProcessor.concatStatus(201, nomina));
        } else {
            res.json(resProcessor.concatStatus(200, null))
        }
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }
})

// ELIMINAR (LOGICO) MEDIANTE ID
router.delete('/:idNomina/:idStaff', async (req, res) => {
    const { idNomina, idStaff } = req.params

    let nomina;
    try {
        nomina = await prisma.detailNomina.update({
            where: {
                idNomina_idStaff: {
                  idNomina: Number(idNomina),
                  idStaff: Number(idStaff),
                },
            },
            data: { 
                deleted: true
            }
        })
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, nomina));
})

// ACTUALIZAR MEDIANTE ID
router.put('/:idNomina/:idStaff', async (req, res) => {
    const { idNomina, idStaff } = req.params
    let { date, salary, extraDays, overtimePay, sfs, afp, loans, other, total, deleted } = req.body

    if (!(idNomina && idStaff && date && salary && extraDays && loans && other )) {
        return res.json(resProcessor.newMessage(400, 'Faltan datos requeridos'));
    }

    const valid = await validate(idNomina, idStaff, date, salary, extraDays, overtimePay, sfs, afp, loans, other, total, deleted);
    if (!valid.result) {
        return res.json(resProcessor.newMessage(400, valid.message));
    }

    salary = parseFloat(salary);
    extraDays = parseInt(extraDays);
    loans = parseFloat(loans);
    other = parseFloat(other);

    if (!overtimePay) {
        overtimePay = parseFloat(((salary / 23.83) * extraDays).toFixed(2));
    } else {
        overtimePay = parseFloat(overtimePay);
    }
    if (!sfs) {
        sfs = parseFloat((salary * (3.04 / 100)).toFixed(2));
    } else {
        sfs = parseFloat(sfs);
    }
    if (!afp) {
        afp = parseFloat((salary * (2.78 / 100)).toFixed(2));
    } else {
        afp = parseFloat(afp);
    }
    if (!total) {
        total = parseFloat((salary + overtimePay - sfs - afp - loans - other).toFixed(2));
    } else {
        total = parseFloat(total);
    }

    let nomina;
    try {
        nomina = await prisma.detailNomina.update({
            where: {
                idNomina_idStaff: {
                  idNomina: Number(idNomina),
                  idStaff: Number(idStaff),
                },
            },
            data: {
                date: date,
                salary: salary,
                extraDays: extraDays,
                overtimePay: overtimePay,
                sfs: sfs,
                afp: afp,
                loans: loans,
                other: other,
                total: total,
                deleted: validator.toBool(deleted.toString()),
            },
        })
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, nomina));
})

// CREAR NUEVO RECORD
router.post('/', async (req, res) => {
    let { idNomina, idStaff, date, salary, extraDays, overtimePay, sfs, afp, loans, other, total } = req.body

    if (!(idNomina && idStaff && date && salary && extraDays && loans && other )) {
        return res.json(resProcessor.newMessage(400, 'Faltan datos requeridos'));
    }

    const valid = await validate(idNomina, idStaff, date, salary, extraDays, overtimePay, sfs, afp, loans, other, total);
    if (!valid.result) {
        return res.json(resProcessor.newMessage(400, valid.message));
    }

    salary = parseFloat(salary);
    extraDays = parseInt(extraDays);
    loans = parseFloat(loans);
    other = parseFloat(other);

    if (!overtimePay) {
        overtimePay = parseFloat(((salary / 23.83) * extraDays).toFixed(2));
    } else {
        overtimePay = parseFloat(overtimePay);
    }
    if (!sfs) {
        sfs = parseFloat((salary * (3.04 / 100)).toFixed(2));
    } else {
        sfs = parseFloat(sfs);
    }
    if (!afp) {
        afp = parseFloat((salary * (2.78 / 100)).toFixed(2));
    } else {
        afp = parseFloat(afp);
    }
    if (!total) {
        total = parseFloat((salary + overtimePay - sfs - afp - loans - other).toFixed(2));
    } else {
        total = parseFloat(total);
    }

    let result;
    try {
        result = await prisma.detailNomina.create({
            data: {
                idNomina: parseInt(idNomina),
                idStaff: parseInt(idStaff),
                date: date,
                salary: salary,
                extraDays: extraDays,
                overtimePay: overtimePay,
                sfs: sfs,
                afp: afp,
                loans: loans,
                other: other,
                total: total,
            },
        })
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }
    res.json(resProcessor.concatStatus(200, result));
})

function validate(idNomina: string, idStaff: string, date: string, salary: string, extraDays: string, overtimePay: string, sfs: string, afp: string, loans: string, other: string, total: string, deleted?: string) {

    const numericChecks = [
        { value: idNomina, message: "Id de nomina no numerico" },
        { value: idStaff, message: "Id de empleado no numerico" },
        { value: extraDays, message: "Dias extras no numericos" },
        { value: salary, message: "Salario no numerico" },
        { value: overtimePay, message: "Pago por horas extras no numerico" },
        { value: sfs, message: "SFS no numerico" },
        { value: afp, message: "AFP no numerico" },
        { value: loans, message: "Prestamos no numericos" },
        { value: other, message: "Otros no numerico" },
        { value: total, message: "Total no numerico" }
    ];
    
    let message = "";
    if (date && !validator.validateDate(date)) {
        message = "Formato de fecha de nomina invalido";
        return {result: false, message: message}
    }
    if (deleted && !validator.isBoolean(deleted)) {
        message = "Se recibio un valor no booleano para el parametro 'deleted'";
        return {result: false, message: message}
    }

    for (const check of numericChecks) {
        if (check.value && !validator.isNumeric(check.value)) {
            return { result: false, message: check.message };
        }
    }
    return {result: true}
}

router.post('/bulk', async (req, res) => {
    const detailNominaDataArray: Record<string, any>[] = [];

    for (const key in req.body) {
        const [index, fieldName] = key.split('_');
        const dataIndex = parseInt(index);

        if (!detailNominaDataArray[dataIndex]) {
            detailNominaDataArray[dataIndex] = {};
        }

        detailNominaDataArray[dataIndex][fieldName] = req.body[key];
    }

    const filteredDataArray = detailNominaDataArray.filter(data => Object.keys(data).length > 0);

    if (filteredDataArray.length === 0) {
        return res.json(resProcessor.newMessage(400, 'La data debe contener al menos un registro'));
    }

    const validationResults = await Promise.all(filteredDataArray.map(validateDetailNominaData));
    const invalidDataIndex = validationResults.findIndex(result => !result.result);

    if (invalidDataIndex !== -1) {
        return res.json(resProcessor.newMessage(400, validationResults[invalidDataIndex].message));
    }

    const bulkCreateData = detailNominaDataArray.map(data => {
        const idNomina = parseInt(data.idNomina);
        const idStaff = parseInt(data.idStaff);
        const date = data.date;
        const salary = parseFloat(data.salary);
        const extraDays = parseInt(data.extraDays);
    
        const overtimePay = parseFloat(data.overtimePay
            ? parseFloat(data.overtimePay).toFixed(2)
            : ((salary / 23.83) * extraDays).toFixed(2)
        );
    
        const sfs = parseFloat(data.sfs
            ? parseFloat(data.sfs).toFixed(2)
            : (salary * (3.04 / 100)).toFixed(2)
        );
    
        const afp = parseFloat(data.afp
            ? parseFloat(data.afp).toFixed(2)
            : (salary * (2.78 / 100)).toFixed(2)
        );
    
        const loans = parseFloat(data.loans);
        const other = parseFloat(data.other);
    
        const total = parseFloat(data.total
            ? parseFloat(data.total).toFixed(2)
            : (
                salary
                + overtimePay
                - sfs
                - afp
                - loans
                - other
            ).toFixed(2)
        );
    
        return {
            idNomina,
            idStaff,
            date,
            salary,
            extraDays,
            overtimePay,
            sfs,
            afp,
            loans,
            other,
            total,
        };
    });    

    let result;
    try {
        result = await prisma.detailNomina.createMany({
            data: bulkCreateData,
            skipDuplicates: true,
        });
    } catch (error: any) {
        return res.json(handleError(error));
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, result));
})

function validateDetailNominaData(data: any) {
    const { idNomina, idStaff, date, salary, extraDays, overtimePay, sfs, afp, loans, other, total } = data;
    
    let message = "";
    if (!(idNomina && idStaff && date && salary && extraDays && loans && other )) {
        message = 'Faltan datos requeridos';
        return {result: false, message: message}
    }

    return validate(idNomina, idStaff, date, salary, extraDays, overtimePay, sfs, afp, loans, other, total);
}

export default router;