import { Router } from 'express';
import { signUp, signIn } from '../Controllers/userController';
import { saveUser } from '../Middlewares/userAuth';

const router = Router();

router.post('/', (req, res) => {
    res.send(req.body);
})

router.post('/signup', saveUser, signUp);

router.post('/signin', signIn);


export default router;