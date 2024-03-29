import { Router } from 'express';
import { PrismaClient } from '@prisma/client'
import validator from '../utils/validatorUtils';
import resProcessor from '../utils/responseProcessor';
import errorHandler from '../handlers/errorHandler';
import routerHandler from '../handlers/routerHandler';

const router = Router();
const prisma = new PrismaClient()

function handleError(error: any) {
    const object = "Evaluation";
    return errorHandler.checkError(object, error);
}

// LISTAR CON PAGINACION DE 10
router.get('/', async (req, res) => {
    const { page } = req.query;
    const pageSize = 10;

    await routerHandler.getData("evaluation", pageSize, page, res);
});

// LISTAR MEDIANTE ID
router.get('/:id', async (req, res) => {
    const { id } = req.params

    let evaluation;
    try {
        evaluation = await prisma.evaluation.findUnique({
            where: { id: Number(id) },
        })
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, evaluation));
})

// LISTAR MEDIANTE ID
router.get('/info/:id', async (req, res) => {
    const { id } = req.params

    let evaluation;
    try {
        evaluation = await prisma.evaluation.findUnique({
            where: { id: Number(id) },
            include: {
                objectives: true
            }
        })
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, evaluation));
})

// ELIMINAR (LOGICO) MEDIANTE ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params

    let evaluation;
    try {
        evaluation = await prisma.evaluation.update({
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

    res.json(resProcessor.concatStatus(200, evaluation));
})

// ACTUALIZAR MEDIANTE ID
router.put('/:id', async (req, res) => {
    const { id } = req.params
    const { date, commment, idStudent } = req.body;

    let evaluation;
    try {
        evaluation = await prisma.evaluation.update({
            where: { id: Number(id) },
            data: {
                date: date || undefined,
                commment: commment || undefined,
                idStudent: idStudent ? Number(idStudent) : undefined,
            },
        })
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.json(resProcessor.concatStatus(200, evaluation));
})

// CREAR NUEVO RECORD
router.post('/', async (req, res) => {
    const { date, commment, idStudent } = req.body;

    if (!(date && idStudent)) {
        return res.json(resProcessor.newMessage(400, 'Faltan datos requeridos' ));
    }

    const valid = await validate(date, idStudent);
    if (!valid.result) {
        return res.json(resProcessor.newMessage(400, valid.message));
    }

    let result;
    try {
        result = await prisma.evaluation.create({
            data: {
                date: date,
                commment: commment || undefined,
                idStudent: Number(idStudent),
            },
        })
    } catch (error: any) {
        return res.json(handleError(error));
        
    } finally {
        await prisma.$disconnect();
    }

    res.status(200).json(resProcessor.concatStatus(200, result));
})

async function validate(date: string, idStudent: string) {
    
    let message = "";
    if (date && !validator.validateDate(date)) {
        message = "Fomato de fecha invalido";
        return {result: false, message: message}
    }
    if (idStudent && !validator.isNumeric(idStudent)) {
        message = "Id del estudiante invalido: No numerico";
        return {result: false, message: message}
    }
    return {result: true}
}

export default router;