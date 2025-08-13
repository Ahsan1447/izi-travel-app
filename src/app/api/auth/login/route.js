import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});



export async function POST(request) {
  try {
    
    const { email, password } = await request.json();
    if (!email || !password) {
      return Response.json({ 
        success: false, 
        error: true, 
        message: 'Email and password are required' 
      }, { status: 400 });
    }

    const authParams = {
      USERNAME: email,
      PASSWORD: password,
    };



    if (process.env.NODE_ENV === 'production') {
      const clientId = process.env.COGNITO_PRO_CLIENT_ID;
      const clientSecret = process.env.COGNITO_CLIENT_SECRET;
      const message = `${email}${clientId}`;
      const crypto = require('crypto');
      const secretHash = crypto.createHmac('sha256', clientSecret).update(message).digest('base64');
      authParams.SECRET_HASH = secretHash;

    }

    const clientId = process.env.NODE_ENV === 'production' 
      ? process.env.COGNITO_PRO_CLIENT_ID 
      : process.env.COGNITO_CLIENT_ID;
    


    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: authParams,
      ClientId: clientId,
    });



    const response = await client.send(command);
    const idToken = response.AuthenticationResult.IdToken;
    
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    
    return Response.json({
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload['custom:role'] || null,
      success: true,
      error: false,
      message: 'Sign in successful!'
    });

  } catch (error) {
    if (error.name === 'NotAuthorizedException') {
      return Response.json({ 
        success: false, 
        error: true, 
        message: 'Invalid email or password' 
      }, { status: 401 });
    } else if (error.name === 'UserNotFoundException') {
      return Response.json({ 
        success: false, 
        error: true, 
        message: 'User not found' 
      }, { status: 404 });
    } else if (error.name === 'UserNotConfirmedException') {
      return Response.json({ 
        success: false, 
        error: true, 
        message: 'User account not confirmed' 
      }, { status: 400 });
    } else {
      return Response.json({ 
        success: false, 
        error: true, 
        message: 'Authentication failed. Please try again.' 
      }, { status: 500 });
    }
  }
} 