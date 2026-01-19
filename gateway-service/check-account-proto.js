const protoLoader = require('@grpc/proto-loader')
const { PROTO_PATH } = require('@ticket_for_cinema/contracts')

console.log('PROTO_PATH.ACCOUNT:', PROTO_PATH.ACCOUNT)

const loaderOptions = {
	keepCase: false,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true
}

try {
	const packageDefinition = protoLoader.loadSync(
		PROTO_PATH.ACCOUNT,
		loaderOptions
	)
	console.log(
		'\nLoaded package definition keys:',
		Object.keys(packageDefinition)
	)

	const accountServiceKey = Object.keys(packageDefinition).find(k =>
		k.includes('AccountService')
	)
	console.log('\nAccountService key found:', accountServiceKey)

	if (accountServiceKey) {
		console.log(
			'AccountService definition:',
			packageDefinition[accountServiceKey]
		)
	}
} catch (err) {
	console.error('\nError loading proto:', err.message)
}
