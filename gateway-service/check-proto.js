const path = require('path')
const fs = require('fs')
const protoLoader = require('@grpc/proto-loader')

const { PROTO_PATH } = require('@ticket_for_cinema/contracts')

console.log('PROTO_PATH.AUTH:', PROTO_PATH.AUTH)
console.log('File exists:', fs.existsSync(PROTO_PATH.AUTH))

// Попробуем загрузить proto файл как это делает NestJS
const loaderOptions = {
	keepCase: false,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true
}

console.log('\nTrying to load proto file with @grpc/proto-loader...')

try {
	const packageDefinition = protoLoader.loadSync(
		PROTO_PATH.AUTH,
		loaderOptions
	)
	console.log(
		'\nLoaded package definition keys:',
		Object.keys(packageDefinition)
	)

	// Проверяем есть ли AuthService
	const authServiceKey = Object.keys(packageDefinition).find(k =>
		k.includes('AuthService')
	)
	console.log('\nAuthService key found:', authServiceKey)

	if (authServiceKey) {
		console.log(
			'AuthService definition:',
			packageDefinition[authServiceKey]
		)
	}
} catch (err) {
	console.error('\nError loading proto:', err.message)
}
