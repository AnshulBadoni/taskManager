import { Router } from 'express';
import { assignProject, createProject, deleteProject, getAllProjects, getProject, unaasignProject, updateProject } from '../Controllers/projectController';

const router = Router();

router.post('/', (req, res) => {
    res.send(req.body);
})

router.post('/createProject', createProject);

router.get('/getAllProjects', getAllProjects);

router.get('/getProject/:name', getProject);

router.put('/updateProject/:id', updateProject);

router.delete('/deleteProject/:id', deleteProject);

router.post('/assignProject/:id/:userId', assignProject);

router.delete('/unassignProject/:id/:userId', unaasignProject);


export default router;