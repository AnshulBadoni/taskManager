import { Request, Response, NextFunction } from "express";
import prisma from "../Connection/prisma";

export const saveUser = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const username = await prisma.users.findUnique({
            where: {
                username:req.body.username
            }
        })
        if(username){
            res.status(409).send("username already exists");
        }

        const email = await prisma.users.findUnique({
            where: {
                email: req.body.email
            }
        })
        if(email){
            res.status(409).send("email already exists");
        }

        next();
    }
    catch(error){
        res.status(500).send("Error creating user" + error);
    }    
}

