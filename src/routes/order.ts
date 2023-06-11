import { Router, response } from 'express';
import { PrismaClient } from '@prisma/client'
import validator from '../utils/validatorUtils';
import resProcessor from '../utils/responseProcessor';
import errorHandler from '../utils/errorHandler';

const router = Router();
const prisma = new PrismaClient()

function handleError(error: any) {
    const object = "Order";
    return errorHandler.checkError(object, error);
}

// LISTAR CON PAGINACION DE 10
router.get('/', async (req, res) => {
    const { page } = req.query;

    let page_int = page && validator.isNumeric(page.toString()) ? Number(page) : 1;

    const pageSize = 10;
    const offset = (page_int - 1) * pageSize;

    let orders;
    try {
        orders = await prisma.order.findMany({
            where: { deleted: false },
            take: pageSize,
            skip: offset,
        });
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, orders));
});

// LISTAR MEDIANTE ID
router.get('/:id', async (req, res) => {
    const { id } = req.params

    let order;
    try {
        order = await prisma.order.findUnique({
            where: { id: Number(id) },
        })
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, order));
})

// ELIMINAR (LOGICO) MEDIANTE ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params

    let order;
    try {
        order = await prisma.order.update({
            where: { id: Number(id) },
            data: { 
                deleted: true
            }
        })
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, order));
})

// ACTUALIZAR MEDIANTE ID
router.put('/:id', async (req, res) => {
    const { id } = req.params
    const { date, total, status } = req.body

    let order;
    try {
        order = await prisma.order.update({
            where: { id: Number(id) },
            data: {
                date: date ? new Date(date) : undefined,
                total: total ? parseFloat(total) : undefined,
                status: status ? validator.toBool(status): undefined,
            },
        })
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, order));
})

// CREAR NUEVO RECORD
router.post('/', async (req, res) => {
    const { date, total, status } = req.body

    if (!(date && total && status)) {
        return res.json(resProcessor.newMessage(400, 'Faltan datos requeridos'));
    }

    const valid = await validate(date, total, status);
    if (!valid.result) {
        return res.json(resProcessor.newMessage(400, valid.message));
    }

    let result;
    try {
        result = await prisma.order.create({
            data: {
                date: new Date(date),
                total: parseFloat(total),
                status: validator.toBool(status),
            },
        });
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, result));
})

async function validate(date: string, total: string, status: string) {
    
    let message = "";
    if (date && !validator.validateDate(date)) {
        message = "Formato de fecha invalido";
        return {result: false, message: message}
    }
    if (total && !validator.isNumeric(total)) {
        message = "Total invalido: No numerico";
        return {result: false, message: message}
    }
    if (status && !validator.isBoolean(status)) {
        message = "Status invalido: No booleano"
        return {result: false, message: message}
    }
    return {result: true}
}

export default router;