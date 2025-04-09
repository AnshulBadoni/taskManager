import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../Connection/prisma";

export const sendMessage = async (req: Request, res: Response) => {
    try {
      const { content, senderId, receiverId, projectId } = req.body;
  
      const newMessage = await prisma.message.create({
        data: {
          content,
          senderId,
          receiverId: receiverId || null,
          projectId: projectId || null,
        },
      });
  
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error saving message:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

  export const getMessages = async (req: Request, res: Response) => {
    try {
      const { projectId, senderId, receiverId } = req.query;
  
      let messages;
      if (projectId) {
        messages = await prisma.message.findMany({ where: { projectId: Number(projectId) } });
      } else if (senderId && receiverId) {
        messages = await prisma.message.findMany({
          where: {
            OR: [
              { senderId: Number(senderId), receiverId: Number(receiverId) },
              { senderId: Number(receiverId), receiverId: Number(senderId) },
            ],
          },
          orderBy: { createdAt: "asc" },
        });
      } else {
        res.status(400).json({ error: "Invalid query parameters" });
        return;
      }
  
      res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  

