build: 
	docker build -t botdagama .

run: 
	docker run -d -p 3000:3000 --name botdagama --rm botdagama