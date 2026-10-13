FROM ruby:3.4.5-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev libyaml-dev && rm -rf /var/lib/apt/lists/*
COPY Gemfile* ./
RUN bundle install
COPY . .
RUN chmod +x bin/rails bin/jobs bin/start-production
EXPOSE 3001
CMD ["bin/start-production"]
