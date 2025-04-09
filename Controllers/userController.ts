import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../Connection/prisma";

export const signUp = async (req: Request, res: Response) => {
  try {
    const { username, email, compcode,password } = req.body;

    const user = await prisma.users.create({
      data: {
        username,
        email,
        compcode,
        password: await bcrypt.hash(password, 10),
      },
    });

    if (user) {
      let token = jwt.sign(
        { id: user.id },
        process.env.secretKey || "defaultSecretKey",
        {
          expiresIn: 1 * 24 * 60 * 60 * 1000,
        }
      );
      res.cookie("jwt", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      });
      res.status(201).send(user);
    } else {
      res.status(409).send("Details are not correct");
    }
  } catch (error) {
    res.status(500).send("Error creating user"+error);
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.users.findUnique({
      where: {
        email: email,
      },
    });

    if (user) {
      const isSame = await bcrypt.compare(password, user.password);

      if (isSame) {
        let token = jwt.sign(
          { id: user.id },
          process.env.secretKey || "defaultSecretKey",
          {
            expiresIn: 1 * 24 * 60 * 60 * 1000,
          }
        );
        res.cookie("jwt", token, {
          maxAge: 1 * 24 * 60 * 60 * 1000,
          httpOnly: true,
        });
        res.status(200).send(user);
      }
    } else {
      res.status(409).send("Authentication Failed");
    }
  } catch (error) {
    res.status(500).send("Login Server Error");
  }
};
