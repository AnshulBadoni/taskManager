import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../Connection/prisma";
import { Status } from "@prisma/client";

export const createTask = async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        status,
        dueDate,
        assignedBy,
        assignedTo,
        projectId,
      }: {
        name: string;
        description: string;
        status: string;
        dueDate: string;
        assignedBy: number;
        assignedTo: number;
        projectId: number;
      } = req.body;
  
      // Validate required fields
      if (!name || !description || !status || !dueDate || !assignedBy || !assignedTo || !projectId) {
        res.status(400).json({ error: "All fields are required" });
        return;
      }
  
      // Check if assignedBy and assignedTo exist in Users table
      const users = await prisma.users.findMany({
        where: { id: { in: [assignedBy, assignedTo] } },
        select: { id: true },
      });
  
      if (users.length < 2) {
        res.status(400).json({ error: "Invalid assignedBy or assignedTo ID" });
        return;
      }
  
      // Create the task
      const newTask = await prisma.tasks.create({
        data: {
          name,
          description,
          status: status as Status,
          dueDate: new Date(dueDate),
          assignedBy: { connect: { id: assignedBy } },
          assignedTo: { connect: { id: assignedTo } },
          project: { connect: { id: projectId } },
        },
        include: {
          assignedBy: true,
          assignedTo: true,
          project: true,
        },
      });
  
      res.status(201).json(newTask);
    } catch (error) {
      console.error("Error creating Task:", error);
      res.status(500).json({ error: "Internal Server Error", details: error });
    }
  };
  

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const Tasks = await prisma.tasks.findMany({
      include: {
        assignedBy: true,
        assignedTo: true,
        project: true,
      },
    });

    res.status(200).json(Tasks);
  } catch (error) {
    console.error("Error fetching Tasks:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const getTask = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const Task = await prisma.tasks.findMany({
      where: { name: name },
      include: {
        assignedBy: true,
        assignedTo: true,
        project: true,
      },
    });

    if (!Task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.status(200).json(Task);
  } catch (error) {
    console.error("Error fetching Task:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const updateTask = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, status, dueDate, assignedById, assignedToId, projectId } = req.body;
  
      // Ensure the ID is a valid number
      if (isNaN(Number(id))) {
        res.status(400).json({ error: "Invalid task ID" });
        return;
      }
  
      const updatedTask = await prisma.tasks.update({
        where: { id: Number(id) },
        data: {
          name,
          description,
          status,
          dueDate,
          ...(assignedById && { assignedById }), 
          ...(assignedToId && { assignedToId }),
          ...(projectId && { projectId }),
        },
      });
  
      res.status(200).json(updatedTask);
    } catch (error) {
      console.error("Error updating Task:", error);
      res.status(500).json({ error: "Internal Server Error", details: error });
    }
  };
  

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.tasks.delete({
      where: { id: Number(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting Task:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
}

export const assignTask = async (req: Request, res: Response) => {
    try {
      const { TaskId, userId } = req.body;
  
      // Validate required fields
      if (!TaskId || !userId) {
        res.status(400).json({ error: "TaskId and userId are required" });
        return;
      }
  
      const updatedTask = await prisma.tasks.update({
        where: { id: Number(TaskId) },
        data: {
          assignedToId: Number(userId),
        },
      });
  
      res.status(200).json({ message: "User assigned to task successfully", task: updatedTask });
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({ error: "Error assigning task", details: error });
    }
  };
  
  export const unassignTask = async (req: Request, res: Response) => {
    try {
      const { TaskId, userId } = req.body;
  
      // Validate required fields
      if (!TaskId || !userId) {
        res.status(400).json({ error: "TaskId and userId are required" });
        return;
      }
  
      const updatedTask = await prisma.tasks.update({
        where: { id: Number(TaskId) },
        data: {
          assignedToId: -1,
        },
      });
  
      res.status(200).json({ message: "User unassigned from task successfully", task: updatedTask });
    } catch (error) {
      console.error("Error unassigning task:", error);
      res.status(500).json({ error: "Error unassigning task", details: error });
    }
  };
  