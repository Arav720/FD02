// routes/library.routes.ts
import { Router } from "express";
import { getLibraries, getLibraryById, getLocations, onboardLibrarian } from "../controllers/libraryController";

const router = Router();

router.get("/", getLibraries);      // GET all with filters, pagination
router.get("/getLocations", getLocations); // GET all locations
router.post("/onboarding",onboardLibrarian)
router.get("/:id", getLibraryById); // GET specific by ID


export default router;
