## Login


### Request

`/api/v1/auth/login`


`email`: [string] valid email

`password`: [string] maching password


```json
{
  "name": "Sarwar Alam",
  "email": "sarwar76200@gmail.com",
  "password": "1234568"
}
```

### Response

#### On successful login
##### Status Code : 200

```json
{
	"access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMjAxMzUxMC1lNWUzLTRmZDktOGYxOC01NzcxMDlmOTQxOWQiLCJleHAiOjE3ODUwODg4OTd9.MVShWctbj22kHP2h0VyL8jZ3RLkbAPm2kYQklQmvVOA",
	"token_type": "bearer",
	"user": {
		"id": "a2013510-e5e3-4fd9-8f18-577109f9419d",
		"email": "sarwar76200@gmail.com",
		"name": "Sarwar Alam"
	}
}
```

#### On  incorrect credentials
##### Status Code : 401
```json
{
	"detail": "Incorrect email or password"
}
```
#### On  invalid email
##### Status Code : 422

```json
{
	"detail": [
		{
			"type": "value_error",
			"loc": [
				"body",
				"email"
			],
			"msg": "value is not a valid email address: An email address must have an @-sign.",
			"input": "sarwar76200.com",
			"ctx": {
				"reason": "An email address must have an @-sign."
			}
		}
	]
}
```

#### On  password too short
##### Status Code : 422

```json
{
	"detail": [
		{
			"type": "string_too_short",
			"loc": [
				"body",
				"password"
			],
			"msg": "String should have at least 8 characters",
			"input": "1234568",
			"ctx": {
				"min_length": 8
			}
		}
	]
}
```

## Signup

### Request

`/api/v1/auth/signup`

`name`: [string]  at least 1 character long

`email`: [string] valid email

`password`: [string] at least 8 characters

### Response

##### On success
##### Status Code : 200

```json
{
	"detail": [
		{
			"type": "value_error",
			"loc": [
				"body",
				"email"
			],
			"msg": "value is not a valid email address: An email address must have an @-sign.",
			"input": "sarwar76200.com",
			"ctx": {
				"reason": "An email address must have an @-sign."
			}
		}
	]
}
```

##### On user already exists
##### Status Code : 409

```json
{
	"detail": "An account with this email already exists"
}
```


#### On  invalid email
##### Status Code : 422

```json
{
	"detail": [
		{
			"type": "value_error",
			"loc": [
				"body",
				"email"
			],
			"msg": "value is not a valid email address: An email address must have an @-sign.",
			"input": "sarwar76200.com",
			"ctx": {
				"reason": "An email address must have an @-sign."
			}
		}
	]
}
```

#### On  password too short
##### Status Code : 422

```json
{
	"detail": [
		{
			"type": "string_too_short",
			"loc": [
				"body",
				"password"
			],
			"msg": "String should have at least 8 characters",
			"input": "1234568",
			"ctx": {
				"min_length": 8
			}
		}
	]
}
```