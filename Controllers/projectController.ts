import { Request, Response } from "express";
import prisma from "../Connection/prisma";
import { redis } from '../Services/redis'
import { getOrSetCache } from "../Services/cache";

export const createProject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      userIds,
    }: { name: string; description: string; userIds?: number[] } = req.body;

    // Validate required fields
    if (!name || !description) {
      res.status(400).json({ error: "Name and description are required" });
      return;
    }

    let usersToConnect: { id: number }[] = [];

    if (userIds && userIds.length > 0) {
      // Fetch only existing users to avoid errors
      const existingUsers = await prisma.users.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      });

      usersToConnect = existingUsers.map((user) => ({ id: user.id }));
    }

    // Create the project (with or without users)
    const newProject = await prisma.projects.create({
      data: {
        name,
        description,
        users: { connect: usersToConnect }, // Empty array if no users are provided
      },
      include: {
        users: true, // Include users in the response
      },
    });

    redis.del('projects:all');
    redis.del(`project:name:${newProject.name}`);
    res.status(201).json(newProject);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const projects = getOrSetCache(
      "projects:all",
      () => prisma.projects.findMany({ include: { users: true } }),
      600
    );
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const project = getOrSetCache(`projects:name:${name}`, () =>
      prisma.projects.findMany({
        where: { name: name },
        include: { users: true },
      }),
      600
    );

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.status(200).json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const updatedProject = await prisma.projects.update({
      where: { id: Number(id) },
      data: { name, description },
    });

    await redis.del('projects:all');
    await redis.del(`project:name:${updatedProject.name}`);

    res.status(200).json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.projects.findUnique({
      where: { id: Number(id) },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return
    }

    await prisma.projects.delete({
      where: { id: Number(id) },
    });

    await redis.del('projects:all');
    await redis.del(`project:name:${project?.name}`);

    res.status(204).send('Project deleted successfully');
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const assignProject = async (req: Request, res: Response) => {
  try {
    const { projectId, userId } = req.body;

    const updatedProject = getOrSetCache(
      `projects:${projectId}`,
      () => prisma.projects.update({
        where: { id: projectId },
        data: {
          users: {
            connect: { id: userId },
          },
        },
      }),
      600
    )
    
    res.status(200).json(updatedProject);
  } catch (error) {
    res.status(500).send("Error creating user" + error);
  }
};

export const unaasignProject = async (req: Request, res: Response) => {
  try {
    const { projectId, userId } = req.body;

    const project = await prisma.projects.findUnique({
        where: {id: projectId},
        include: { users: true }
    })

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return
    }

    const updatedProject = await prisma.projects.update({
      where: { id: projectId },
      data: {
        users: {
          disconnect: { id: userId },
        },
      },
    });

    redis.del('projects:all');
    redis.del(`project:name:${project?.name}`);

    res.status(200).json(updatedProject);
  } catch (error) {
    res.status(500).send("Error creating user" + error);
  }
};
