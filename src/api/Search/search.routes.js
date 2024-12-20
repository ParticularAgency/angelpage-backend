import { Router } from "express";
import { getSearchSuggestions } from "./search.controller";

const router = Router();

router.get("/suggestions", getSearchSuggestions);

export default router;
