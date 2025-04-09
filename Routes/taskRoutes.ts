import { Router } from 'express';
import { assignTask, createTask, deleteTask, getAllTasks, getTask, unassignTask, updateTask } from '../Controllers/taskController';

const router = Router();

router.post('/', (req, res) => {
    res.send(req.body);
})

router.post('/createTask', createTask);

router.get('/getAllTasks', getAllTasks);

router.get('/getTask/:name', getTask);

router.put('/updateTask/:id', updateTask);

router.delete('/deleteTask/:id', deleteTask);

router.post('/assignTask/:id/:userId', assignTask);

router.delete('/unassignTask/:id/:userId', unassignTask);


export default router;