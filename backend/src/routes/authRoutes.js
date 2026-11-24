const express = require('express');
const router = express.Router();

const { login } = require('../controllers/authController');
const { registerUser } = require('../controllers/userController');
const {
  verifyToken,
  checkRole,
} = require('../middlewares/authMiddleware');

// Connexion : route publique, identifiants communs Web et mobile.
router.post('/login', login);

// Création d'un compte : Administrateur authentifié uniquement.
// La route /api/users/register est également protégée par le même rôle.
router.post(
  '/register',
  verifyToken,
  checkRole('ADMINISTRATEUR'),
  registerUser,
);

module.exports = router;
