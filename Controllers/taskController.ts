import { Request, Response } from "express";
import prisma from "../Connection/prisma";
import { Status } from "@prisma/client";
import { redis } from "../Services/redis";
import { getOrSetCache } from "../Services/cache";
import { deleteCache, setKafka } from "../util";

function isTaskExists(taskId: number): Promise<boolean> {
  return prisma.tasks
    .findUnique({ where: { id: taskId } })
    .then((task) => !!task);
}
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
    if (
      !name ||
      !description ||
      !status ||
      !dueDate ||
      !assignedBy ||
      !assignedTo ||
      !projectId
    ) {
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

    await deleteCache("tasks:all", `task:name:${newTask.name}`);
    await setKafka("task-events", "project-created", newTask);
    
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error creating Task:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const Tasks = getOrSetCache(
      "tasks:all",
      () =>
        prisma.tasks.findMany({
          include: { assignedBy: true, assignedTo: true, project: true },
        }),
      600
    );
  
    res.status(200).json(Tasks);
  } catch (error) {
    console.error("Error fetching Tasks:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const getTask = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const Task = getOrSetCache(
      `tasks:name:${name}`,
      () =>
        prisma.tasks.findMany({
          where: { name: name },
          include: {
            assignedBy: true,
            assignedTo: true,
            project: true,
          },
        }),
      600
    );

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
    const {
      name,
      description,
      status,
      dueDate,
      assignedById,
      assignedToId,
      projectId,
    } = req.body;

    // Ensure the ID is a valid number
    if (isNaN(Number(id))) {
      res.status(400).json({ error: "Invalid task ID" });
      return;
    }

    const existingTask = isTaskExists(Number(id));

    if (!existingTask) {
      res.status(404).json({ error: "Task not found" });
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

    await deleteCache("tasks:all", `task:name:${updatedTask.name}`);
    await setKafka("task-events", "task-updated", updatedTask);
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error updating Task:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingTask = isTaskExists(Number(id));

    if (!existingTask) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    await prisma.tasks.delete({
      where: { id: Number(id) },
    });

    await deleteCache("tasks:all", `task:name:${id}`);
    await setKafka("task-events", "task-deleted", { id: Number(id) });
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting Task:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const assignTask = async (req: Request, res: Response) => {
  try {
    const { TaskId, userId } = req.body;

    // Validate required fields
    if (!TaskId || !userId) {
      res.status(400).json({ error: "TaskId and userId are required" });
      return;
    }

    const existingTask = isTaskExists(Number(TaskId));

    if (!existingTask) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const updatedTask = await prisma.tasks.update({
      where: { id: Number(TaskId) },
      data: {
        assignedToId: Number(userId),
      },
    });

    await deleteCache("tasks:all", `task:name:${updatedTask.name}`);
    await setKafka("task-events", "task-assigned", updatedTask);
    res
      .status(200)
      .json({
        message: "User assigned to task successfully",
        task: updatedTask,
      });
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

    const existingTask = isTaskExists(Number(TaskId));

    if (!existingTask) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const updatedTask = await prisma.tasks.update({
      where: { id: Number(TaskId) },
      data: {
        assignedToId: -1,
      },
    });

    await deleteCache("tasks:all", `task:name:${updatedTask.name}`);
    await setKafka("task-events", "task-unassigned", updatedTask);
    res
      .status(200)
      .json({
        message: "User unassigned from task successfully",
        task: updatedTask,
      });
  } catch (error) {
    console.error("Error unassigning task:", error);
    res.status(500).json({ error: "Error unassigning task", details: error });
  }
};
