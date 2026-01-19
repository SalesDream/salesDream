const express = require("express");
const router = express.Router();

const controller = require("./controller");
const { auth } = require("../../middleware/auth");

// Public unsubscribe endpoint
router.post("/unsubscribe", controller.unsubscribe);

// Authenticated routes
router.use(auth);

router.get("/lists", controller.getLists);
router.post("/lists", controller.createList);
router.put("/lists/:id", controller.updateList);
router.delete("/lists/:id", controller.deleteList);
router.post("/lists/:id/contacts", controller.addContacts);
router.post("/lists/:id/contacts/remove", controller.removeContactsFromList);
router.post("/lists/:id/import", controller.importContacts);
router.get("/contacts", controller.getContacts);
router.post("/contacts/import", controller.importContactsDirect);
router.put("/contacts/:id", controller.updateContact);
router.delete("/contacts/:id", controller.deleteContact);

router.get("/templates", controller.getTemplates);
router.post("/templates", controller.createTemplate);
router.put("/templates/:id", controller.updateTemplate);
router.delete("/templates/:id", controller.deleteTemplate);
router.post("/templates/ai", controller.generateAiTemplate);

router.get("/campaigns", controller.getCampaigns);
router.post("/campaigns", controller.createCampaign);
router.get("/campaigns/:id", controller.getCampaignDetail);
router.put("/campaigns/:id", controller.updateCampaign);
router.delete("/campaigns/:id", controller.deleteCampaign);
router.post("/campaigns/:id/steps", controller.setCampaignSteps);
router.post("/campaigns/:id/launch", controller.launchCampaign);
router.post("/campaigns/:id/pause", controller.pauseCampaign);
router.get("/campaigns/:id/messages", controller.getCampaignMessages);
router.get("/campaigns/:id/contacts", controller.getCampaignContacts);
router.get("/campaigns/:id/history", controller.getCampaignHistory);
router.get("/campaigns/:id/stats", controller.getCampaignStats);
router.post("/events", controller.createEvent);

module.exports = router;
