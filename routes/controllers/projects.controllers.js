const createError = require("http-errors");
const jwt = require("jsonwebtoken");

const Project = require("../../models/Project");
const User = require("../../models/User");
const Plot = require("../../models/Plot");
const Character = require("../../models/Character");

const {
  NO_AUTHORITY_TO_ACCESS,
  UNEXPECTED_ERROR,
  INVALID_REQUEST,
  OK,
} = require("../../constants/messages");

const {
  CHAPTER_SITUATION,
  CHAPTER_LOCATION_TITLE,
  CHAPTER_LOCATION_DESCRIPTION,
  CHAPTER_LOCATION_IMAGE,
  PLOT_SITUATION,
  PLOT_LOCATION_TITLE,
  PLOT_LOCATION_DESCRIPTION,
  CHARACTER_PERSONALITY,
  CHARACTER_APPEARANCE,
  CHARACTER_AGE,
  CHARACTER_SEX,
  CHARACTER_ROLE,
  CHARACTER_NAME,
  CHARACTER_ETC,
  CHARACTER_IMAGE
} = require("../../constants/examples");

const getProject = async (req, res, next) => {
  const { id } = req.params;

  try {
    const project = await Project
      .findById(id)
      .populate(["characters", "plots"]);

    res
      .status(200)
      .send({ result: OK, project });
  } catch (error) {
    next(error);
  }
};

const getProjectList = async (req, res, next) => {
  const { auth: token } = req.cookies;

  const userId = jwt.decode(token);

  try {
    const user = await User
      .findById(userId)
      .populate(["projects"]);

    res
      .status(200)
      .send({ result: OK, projects: user.projects });
  } catch (error) {
    next(error);
  }
};

const createProject = async (req, res, next) => {
  const { creatorId, title, description } = req.body;
  const { auth: token } = req.cookies;

  const userId = jwt.decode(token);

  try {
    const isInValidUser = String(userId) !== String(creatorId);

    if (isInValidUser) {
      throw createError(403, NO_AUTHORITY_TO_ACCESS);
    }

    const isInvalidRequest = (creatorId === undefined) || (title === undefined) || (description === undefined);

    if (isInvalidRequest) {
      throw createError(422, INVALID_REQUEST);
    }

    const createdProject = await Project.create({
      title,
      description,
      plots: [],
    });

    await User.findByIdAndUpdate(
      userId,
      { $push: { projects: createdProject._id } },
      { new: true }
    );

    const initialChapterCard = await Plot.create({
      isTimeFlag: true,
      situation: CHAPTER_SITUATION,
      location: {
        title: CHAPTER_LOCATION_TITLE,
        imageURL: CHAPTER_LOCATION_IMAGE,
        description: CHAPTER_LOCATION_DESCRIPTION,
      },
    });

    console.log(initialChapterCard);

    const initialPlotCard = await Plot.create({
      isTimeFlag: false,
      situation: PLOT_SITUATION,
      location: {
        title: PLOT_LOCATION_TITLE,
        imageURL: CHAPTER_LOCATION_IMAGE,
        description: PLOT_LOCATION_DESCRIPTION,
      },
    });

    console.log(initialPlotCard);

    await Project.findByIdAndUpdate(
      createdProject._id,
      { $push: { plots: initialChapterCard } },
      { new: true }
    );

    await Project.findByIdAndUpdate(
      createdProject._id,
      { $push: { plots: initialPlotCard } },
      { new: true }
    );

    const initialCharacter = await Character.create({
      name: CHARACTER_NAME,
      role: CHARACTER_ROLE,
      sex: CHARACTER_SEX,
      age: CHARACTER_AGE,
      appearance: CHARACTER_APPEARANCE,
      personality: CHARACTER_PERSONALITY,
      etc: CHARACTER_ETC,
      imageURL: CHARACTER_IMAGE,
    });

    await Project.findByIdAndUpdate(
      createdProject._id,
      { $push: { characters: initialCharacter } },
      { new: true }
    );

    res.send({ result: OK });
  } catch (error) {
    if (error.status) {
      next(error);

      return;
    }

    next({ message: UNEXPECTED_ERROR });
  }
};

const deleteProject = async (req, res, next) => {
  const { projectId } = req.body;
  const { auth: token } = req.cookies;

  const userId = jwt.decode(token);

  try {
    const project = await Project.findByIdAndDelete(projectId, { new: true });

    if (project === null) {
      throw createError(404, NOT_FOUND);
    }

    await User.findByIdAndUpdate(
      userId,
      { $pull: { projects: projectId } },
      { new: true }
    );

    res.send({ result: OK });
  } catch (error) {
    if (error.status) {
      next(error);

      return;
    }

    next({ message: UNEXPECTED_ERROR });
  }
};

module.exports = {
  getProject,
  getProjectList,
  createProject,
  deleteProject,
};
