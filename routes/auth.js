function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Token хэрэгтэй',
      message: 'Authorization header дутуу. Bearer token илгээнэ үү.' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (token !== process.env.API_TOKEN) {
    return res.status(403).json({ 
      error: 'Token буруу',
      message: 'Та зөв token ашиглана уу.' 
    });
  }
  
  next();
}

module.exports = { authenticate };